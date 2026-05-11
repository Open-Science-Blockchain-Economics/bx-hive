import type { AlgorandClient } from '@algorandfoundation/algokit-utils'
import type { Page } from '@playwright/test'
import { TrustVariationClient } from '../../../src/contracts/TrustVariation'
import type { KmdAccount } from '../fixtures/accounts'

async function gotoParticipantDashboard(page: Page, participant: KmdAccount): Promise<void> {
  await page.goto(`/?e2e-account=${participant.address}`)
  await page
    .getByRole('link', { name: /^Dashboard$/i })
    .first()
    .click()
  await page.getByRole('heading', { name: /Participant Dashboard/i }).waitFor()
}

/**
 * Drives the participant dashboard to enroll the participant in the variation
 * belonging to `expId`. Polls the chain (via the variation app) until the
 * participant is recorded as enrolled, since the UI's React Query state can lag
 * behind the on-chain confirmation.
 */
export async function enrollParticipant(
  page: Page,
  algorand: AlgorandClient,
  participant: KmdAccount,
  expId: number,
  variationAppId: bigint,
): Promise<void> {
  await gotoParticipantDashboard(page, participant)

  const card = page.locator('[data-slot="panel"]', { hasText: `Experiment ID: ${expId}` })
  await card.getByRole('button', { name: /Join experiment/i }).click()

  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: participant.address,
  })

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const info = await variationClient.state.box.participants.value(participant.address)
      if (info && info.enrolled === 1) return
    } catch {
      // Box doesn't exist yet (404 from algod) — txn hasn't confirmed; keep polling.
    }
    await new Promise((r) => setTimeout(r, 1_000))
  }
  throw new Error(`Participant ${participant.address} did not appear as enrolled in app ${variationAppId} within 30s`)
}

async function dismissInstructions(page: Page): Promise<void> {
  await page.getByRole('button', { name: /I Understand/i }).click()
}

async function selectAlgoButton(page: Page, amountAlgo: number): Promise<void> {
  // The decision option grids render one button per allowed amount, label = the
  // numeric amount as text. Use an exact match so "10" doesn't also match "100".
  await page.getByRole('button', { name: new RegExp(`^${amountAlgo}$`) }).click()
}

async function waitForMatchPhase(
  algorand: AlgorandClient,
  variationAppId: bigint,
  participantAddress: string,
  targetPhase: number,
  timeoutMs = 30_000,
): Promise<void> {
  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: participantAddress,
  })
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const matchIdResult = await variationClient.send.getPlayerMatch({ args: { addr: participantAddress } })
      const matchId = matchIdResult.return
      if (matchId !== undefined) {
        const match = (await variationClient.send.getMatch({ args: { matchId } })).return
        if (match && match.phase >= targetPhase) return
      }
    } catch {
      // Box read 404 or transient — keep polling.
    }
    await new Promise((r) => setTimeout(r, 1_000))
  }
  throw new Error(`Match for ${participantAddress} in app ${variationAppId} did not reach phase ${targetPhase} within ${timeoutMs}ms`)
}

/**
 * Drives the play page for a matched investor: dismiss instructions, pick the
 * amount, submit. Polls the chain until the match phase advances past the
 * investor decision — UI signals (button text, loading spinner) are too brief
 * to be a reliable wait target.
 */
export async function playInvestor(
  page: Page,
  algorand: AlgorandClient,
  participant: KmdAccount,
  variationAppId: bigint,
  investmentAlgo: number,
): Promise<void> {
  await page.goto(`/play/${variationAppId}?e2e-account=${participant.address}`)
  await dismissInstructions(page)
  await page.getByRole('heading', { name: /Investor Decision/i }).waitFor()
  await selectAlgoButton(page, investmentAlgo)
  await page.getByRole('button', { name: /Submit Investment Decision/i }).click()
  await waitForMatchPhase(algorand, variationAppId, participant.address, 1) // PHASE_TRUSTEE_DECISION
}

/**
 * Symmetric to playInvestor, but for the trustee phase. Polls until the match
 * reaches PHASE_COMPLETED.
 */
export async function playTrustee(
  page: Page,
  algorand: AlgorandClient,
  participant: KmdAccount,
  variationAppId: bigint,
  returnAlgo: number,
): Promise<void> {
  await page.goto(`/play/${variationAppId}?e2e-account=${participant.address}`)
  await dismissInstructions(page)
  await page.getByRole('heading', { name: /Trustee Decision/i }).waitFor()
  await selectAlgoButton(page, returnAlgo)
  await page.getByRole('button', { name: /Submit Return Decision/i }).click()
  await waitForMatchPhase(algorand, variationAppId, participant.address, 2) // PHASE_COMPLETED
}

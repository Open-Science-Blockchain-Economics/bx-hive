import type { AlgorandClient } from '@algorandfoundation/algokit-utils'
import type { Page } from '@playwright/test'
import { TrustVariationClient } from '../../../src/contracts/TrustVariation'
import type { KmdAccount } from '../fixtures/accounts'

async function gotoSubjectDashboard(page: Page, subject: KmdAccount): Promise<void> {
  await page.goto(`/?e2e-account=${subject.address}`)
  await page
    .getByRole('link', { name: /^Dashboard$/i })
    .first()
    .click()
  await page.getByRole('heading', { name: /Subject Dashboard/i }).waitFor()
}

/**
 * Drives the subject dashboard to enroll the subject in the variation
 * belonging to `expId`. Polls the chain (via the variation app) until the
 * subject is recorded as enrolled, since the UI's React Query state can lag
 * behind the on-chain confirmation.
 */
export async function enrollSubject(
  page: Page,
  algorand: AlgorandClient,
  subject: KmdAccount,
  expId: number,
  variationAppId: bigint,
): Promise<void> {
  await gotoSubjectDashboard(page, subject)

  const card = page.locator('div.card', { has: page.getByText(`Experiment ID: ${expId}`) })
  await card.getByRole('button', { name: /Join Experiment/i }).click()

  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: subject.address,
  })

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const info = await variationClient.state.box.subjects.value(subject.address)
      if (info && info.enrolled === 1) return
    } catch {
      // Box doesn't exist yet (404 from algod) — txn hasn't confirmed; keep polling.
    }
    await new Promise((r) => setTimeout(r, 1_000))
  }
  throw new Error(`Subject ${subject.address} did not appear as enrolled in app ${variationAppId} within 30s`)
}

async function dismissInstructions(page: Page): Promise<void> {
  await page.getByRole('button', { name: /I Understand/i }).click()
}

async function selectAlgoButton(page: Page, amountAlgo: number): Promise<void> {
  // The decision option grids render one button per allowed amount, label = the
  // numeric amount as text. Use an exact match so "10" doesn't also match "100".
  await page.getByRole('button', { name: new RegExp(`^${amountAlgo}$`) }).click()
}

/**
 * Drives the play page for a matched investor: dismiss instructions, pick the
 * investment amount, submit. Returns once the click is fired — chain-side
 * confirmation is the caller's responsibility (e.g. via getMatch).
 */
export async function playInvestor(page: Page, subject: KmdAccount, variationAppId: bigint, investmentAlgo: number): Promise<void> {
  await page.goto(`/play/${variationAppId}?e2e-account=${subject.address}`)
  await dismissInstructions(page)
  await page.getByRole('heading', { name: /Investor Decision/i }).waitFor()
  await selectAlgoButton(page, investmentAlgo)
  await page.getByRole('button', { name: /Submit Investment Decision/i }).click()
  await page.getByRole('button', { name: /Submit Investment Decision/i }).waitFor({ state: 'hidden' })
}

/**
 * Symmetric to playInvestor, but for the trustee phase.
 */
export async function playTrustee(page: Page, subject: KmdAccount, variationAppId: bigint, returnAlgo: number): Promise<void> {
  await page.goto(`/play/${variationAppId}?e2e-account=${subject.address}`)
  await dismissInstructions(page)
  await page.getByRole('heading', { name: /Trustee Decision/i }).waitFor()
  await selectAlgoButton(page, returnAlgo)
  await page.getByRole('button', { name: /Submit Return Decision/i }).click()
  await page.getByRole('button', { name: /Submit Return Decision/i }).waitFor({ state: 'hidden' })
}

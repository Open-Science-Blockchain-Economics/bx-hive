import { TrustVariationClient } from '../../src/contracts/TrustVariation'
import { expect, test } from './fixtures'
import { createExperimentAndVariation, openExperimentDetails } from './stages/experimenter'
import { enrollParticipant, gotoParticipantDashboard } from './stages/participant'

const E1_ALGO = 2
const E2_ALGO = 0
const MULTIPLIER = 3
const UNIT_ALGO = 1
// The create form doubles this into max participants, so 2 matches = capacity 4.
// Two enrolments leave room, which pins the card's disappearance on the close
// rather than on the variation filling up.
const MAX_MATCHES = 2

// Mirrors STATUS_CLOSED in src/hooks/useTrustVariation.ts.
const STATUS_CLOSED = 1

// Assertions that follow a wallet transaction have to outlast block confirmation
// plus the query invalidation behind it; the 5s expect default is too tight.
const CHAIN_TIMEOUT_MS = 30_000

test('closing registration drops the experiment from Available but leaves enrolled participants matchable', async ({
  page,
  algorand,
  experimenter,
  participant1,
  participant2,
  participant3,
}) => {
  const name = `e2e-close-registration-${Date.now()}`
  const { expId, variationAppId } = await createExperimentAndVariation(page, algorand, experimenter.address, {
    name,
    e1Algo: E1_ALGO,
    e2Algo: E2_ALGO,
    multiplier: MULTIPLIER,
    unitAlgo: UNIT_ALGO,
    maxMatchesPerVariation: MAX_MATCHES,
  })

  await enrollParticipant(page, algorand, participant1, expId, variationAppId)
  await enrollParticipant(page, algorand, participant2, expId, variationAppId)

  // participant3 never enrols — the observer whose Available list has to change.
  await gotoParticipantDashboard(page, participant3)
  const observerCard = page.locator('[data-slot="panel"]').filter({ hasText: name })
  await expect(observerCard.getByRole('button', { name: /Join experiment/i })).toBeVisible()
  await expect(observerCard.locator('[data-slot="chip"]', { hasText: /^Open$/ })).toBeVisible()

  await openExperimentDetails(page, experimenter.address, expId)
  const variationPanel = page.locator('[data-slot="panel"]').filter({ has: page.getByRole('heading', { name: 'Parameters' }) })
  await variationPanel.getByRole('button', { name: 'Close registration' }).click()
  await expect(variationPanel.locator('[data-slot="chip"]', { hasText: /^Closed$/ })).toBeVisible({ timeout: CHAIN_TIMEOUT_MS })
  await expect(variationPanel.getByRole('button', { name: 'Close registration' })).toHaveCount(0)

  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: experimenter.address,
  })
  const closedConfig = (await variationClient.send.getConfig({ args: {} })).return!
  expect(closedConfig.status).toBe(STATUS_CLOSED)

  // The regression this whole change exists to prevent: a closed experiment used
  // to stay in Available labelled "Full", offering a Join that fails on-chain.
  await gotoParticipantDashboard(page, participant3)
  await expect(page.locator('[data-slot="panel"]').filter({ hasText: name })).toHaveCount(0)

  // Closing must not strand whoever joined before it.
  await gotoParticipantDashboard(page, participant1)
  const enrolledCard = page.locator('[data-slot="panel"]').filter({ hasText: name })
  await expect(enrolledCard.getByText(/waiting for match assignment/i)).toBeVisible()
  await expect(enrolledCard.getByRole('button', { name: /Join experiment/i })).toHaveCount(0)

  // Guards the earlier bug where the UI hid the Create Match form on a closed
  // variation, even though the contract's create_match has no status check.
  await openExperimentDetails(page, experimenter.address, expId)
  await expect(variationPanel.getByRole('heading', { name: 'Create Match' })).toBeVisible()
  await variationPanel.getByLabel('Investor', { exact: true }).selectOption(participant1.address)
  await variationPanel.getByLabel('Trustee', { exact: true }).selectOption(participant2.address)
  await variationPanel.getByRole('button', { name: 'Create match' }).click()
  await expect(variationPanel.getByRole('heading', { name: 'Matches (1)' })).toBeVisible({ timeout: CHAIN_TIMEOUT_MS })

  const matchId = (await variationClient.send.getPlayerMatch({ args: { addr: participant1.address } })).return!
  const match = (await variationClient.send.getMatch({ args: { matchId } })).return!
  expect(match.investor).toBe(participant1.address)
  expect(match.trustee).toBe(participant2.address)
})

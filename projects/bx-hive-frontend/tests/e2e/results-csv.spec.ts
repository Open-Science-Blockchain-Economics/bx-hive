import { readFile } from 'node:fs/promises'
import { TrustVariationClient } from '../../src/contracts/TrustVariation'
import { ownerCreateMatch } from '../integration/helpers/operations'
import { expect, test } from './fixtures'
import { createExperimentAndVariation } from './stages/experimenter'
import { enrollParticipant, playInvestor, playTrustee } from './stages/participant'

const E1_ALGO = 2
const E2_ALGO = 0
const MULTIPLIER = 3
const UNIT_ALGO = 1
const INVESTMENT_ALGO = 1
const RETURN_ALGO = 2

// Column indices in the exported CSV (see HEADERS in src/utils/trustResultsCsv.ts).
const COL = { address: 5, role: 6, state: 7, investmentWhole: 9, payoutWhole: 13, payoutBase: 14 } as const

test('experimenter downloads a results CSV with per-address payouts for a completed match', async ({
  page,
  algorand,
  experimenter,
  participant1,
  participant2,
}) => {
  const { expId, variationAppId } = await createExperimentAndVariation(page, algorand, experimenter.address, {
    name: `e2e-results-csv-${Date.now()}`,
    e1Algo: E1_ALGO,
    e2Algo: E2_ALGO,
    multiplier: MULTIPLIER,
    unitAlgo: UNIT_ALGO,
    maxMatchesPerVariation: 1,
  })

  await enrollParticipant(page, algorand, participant1, expId, variationAppId)
  await enrollParticipant(page, algorand, participant2, expId, variationAppId)

  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: experimenter.address,
  })
  await ownerCreateMatch(algorand, variationClient, experimenter.address, participant1.address, participant2.address)

  await playInvestor(page, algorand, participant1, variationAppId, INVESTMENT_ALGO)
  await playTrustee(page, algorand, participant2, variationAppId, RETURN_ALGO)

  // Reconnect as the experimenter (the participants' plays left the browser
  // connected as participant2). Entering via /app/join keeps the ?e2e-account
  // param; the Dashboard link only renders once the experimenter user loads.
  await page.goto(`/app/join?e2e-account=${experimenter.address}`)
  await page
    .getByRole('link', { name: /^Dashboard$/i })
    .first()
    .click()

  await page.goto(`/app/experimenter/trust/${expId}`)
  const downloadBtn = page.getByRole('button', { name: 'Download CSV' })
  await expect(downloadBtn).toBeEnabled()

  const [download] = await Promise.all([page.waitForEvent('download'), downloadBtn.click()])

  expect(download.suggestedFilename()).toMatch(new RegExp(`^trust-experiment-${expId}-results-\\d{4}-\\d{2}-\\d{2}\\.csv$`))

  const csv = await readFile(await download.path(), 'utf8')
  const [header, ...rows] = csv.split('\r\n')
  expect(header).toBe(
    'variation_id,variation_label,app_id,asset_id,unit_name,address,role,state,match_id,investment_whole,investment_base,return_whole,return_base,payout_whole,payout_base,created_at,completed_at',
  )

  // investorPayout = E1 − investment + return = 2 − 1 + 2 = 3 ALGO
  const investorRow = rows.find((r) => r.includes(participant1.address))
  expect(investorRow, 'investor row for participant1 should be present').toBeDefined()
  const investor = investorRow!.split(',')
  expect(investor[COL.address]).toBe(participant1.address)
  expect(investor[COL.role]).toBe('Investor')
  expect(investor[COL.state]).toBe('Completed')
  expect(investor[COL.investmentWhole]).toBe('1.000000')
  expect(investor[COL.payoutWhole]).toBe('3.000000')
  expect(investor[COL.payoutBase]).toBe('3000000')

  // trusteePayout = E2 + multiplier·investment − return = 0 + 3 − 2 = 1 ALGO
  const trusteeRow = rows.find((r) => r.includes(participant2.address))
  expect(trusteeRow, 'trustee row for participant2 should be present').toBeDefined()
  const trustee = trusteeRow!.split(',')
  expect(trustee[COL.role]).toBe('Trustee')
  expect(trustee[COL.state]).toBe('Completed')
  expect(trustee[COL.payoutWhole]).toBe('1.000000')
  expect(trustee[COL.payoutBase]).toBe('1000000')
})

import { TrustVariationClient } from '../../src/contracts/TrustVariation'
import { ownerCreateMatch } from '../integration/helpers/operations'
import { expect, test } from './fixtures'
import { readDeployedContracts } from './fixtures/deployedContracts'
import { createExperimentAndVariation } from './stages/experimenter'
import { enrollParticipant, playInvestor, playTrustee } from './stages/participant'

const E1_WHOLE = 2
const E2_WHOLE = 0
const MULTIPLIER = 3
const UNIT_WHOLE = 1
const INVESTMENT_WHOLE = 1
const RETURN_WHOLE = 2

const PHASE_COMPLETED = 2
const USDC_DECIMALS = 6
const BASE = 10n ** BigInt(USDC_DECIMALS)

/**
 * Full USDC round-trip via the browser:
 *   - experimenter selects USDC in the picker, the create group bundles
 *     the (one-time) TrustExperiments opt-in + escrow asset-transfer + appcall
 *   - each participant's selfEnroll bundles their own assetOptIn so they can
 *     receive payouts
 *   - trustee-decision payouts arrive as USDC asset-holding amounts
 */
test('full USDC round-trip: picker + bundled opt-ins + asset-transfer payouts', async ({
  page,
  algorand,
  experimenter,
  participant1,
  participant2,
}) => {
  const usdc = readDeployedContracts().usdcAssetId

  // The experimenter needs USDC to fund the escrow. Opt them in and airdrop
  // from the dispenser. Participants stay un-opted-in so the e2e exercises
  // the bundled-opt-in path in selfEnroll.
  const dispenser = await algorand.account.kmd.getLocalNetDispenserAccount()
  algorand.setSignerFromAccount(dispenser)
  // Inline opt-in (instead of the integration helper) to avoid the Address vs
  // string type mismatch — algorand.send accepts both freely.
  try {
    await algorand.send.assetOptIn({ sender: experimenter.address, assetId: usdc })
  } catch {
    // already opted in
  }
  await algorand.send.assetTransfer({
    sender: dispenser.addr,
    receiver: experimenter.address,
    assetId: usdc,
    amount: 10_000n * BASE,
  })

  const { expId, variationAppId } = await createExperimentAndVariation(page, algorand, experimenter.address, {
    name: `e2e-usdc-${Date.now()}`,
    e1Algo: E1_WHOLE,
    e2Algo: E2_WHOLE,
    multiplier: MULTIPLIER,
    unitAlgo: UNIT_WHOLE,
    maxMatchesPerVariation: 1,
    payoutAsset: 'USDC',
  })

  // Each enrollment uses selfEnroll, which now prepends a participant-signed
  // assetOptIn when the wallet isn't yet opted in. After this call participants
  // should hold the asset (with zero balance) and be enrolled.
  await enrollParticipant(page, algorand, participant1, expId, variationAppId)
  await enrollParticipant(page, algorand, participant2, expId, variationAppId)

  // Owner pairs the two participants programmatically (same as round-trip.spec.ts).
  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: experimenter.address,
  })
  const matchId = await ownerCreateMatch(algorand, variationClient, experimenter.address, participant1.address, participant2.address)

  await playInvestor(page, algorand, participant1, variationAppId, INVESTMENT_WHOLE)
  await playTrustee(page, algorand, participant2, variationAppId, RETURN_WHOLE)

  const finalMatch = (await variationClient.send.getMatch({ args: { matchId } })).return!

  const E1 = BigInt(E1_WHOLE) * BASE
  const E2 = BigInt(E2_WHOLE) * BASE
  const investment = BigInt(INVESTMENT_WHOLE) * BASE
  const ret = BigInt(RETURN_WHOLE) * BASE
  const expectedInvestorPayout = E1 - investment + ret
  const expectedTrusteePayout = E2 + investment * BigInt(MULTIPLIER) - ret

  expect(finalMatch.phase).toBe(PHASE_COMPLETED)
  expect(finalMatch.investment).toBe(investment)
  expect(finalMatch.returnAmount).toBe(ret)
  expect(finalMatch.investorPayout).toBe(expectedInvestorPayout)
  expect(finalMatch.trusteePayout).toBe(expectedTrusteePayout)
  expect(finalMatch.paidOut).toBe(1)

  // Decisive on-chain check: payouts landed in USDC asset balances, not ALGO.
  const investorUsdc = await algorand.client.algod.accountAssetInformation(participant1.address, usdc)
  const trusteeUsdc = await algorand.client.algod.accountAssetInformation(participant2.address, usdc)
  expect(investorUsdc.assetHolding!.amount).toBe(expectedInvestorPayout)
  expect(trusteeUsdc.assetHolding!.amount).toBe(expectedTrusteePayout)
})

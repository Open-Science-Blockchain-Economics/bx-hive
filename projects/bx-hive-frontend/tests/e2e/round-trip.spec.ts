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

const PHASE_COMPLETED = 2

test('full round-trip: experimenter creates variation, two participants play, payouts match formula', async ({
  page,
  algorand,
  experimenter,
  participant1,
  participant2,
}) => {
  const { expId, variationAppId } = await createExperimentAndVariation(page, algorand, experimenter.address, {
    name: `e2e-roundtrip-${Date.now()}`,
    e1Algo: E1_ALGO,
    e2Algo: E2_ALGO,
    multiplier: MULTIPLIER,
    unitAlgo: UNIT_ALGO,
    maxMatchesPerVariation: 1,
  })

  await enrollParticipant(page, algorand, participant1, expId, variationAppId)
  await enrollParticipant(page, algorand, participant2, expId, variationAppId)

  // Owner pairs the two participants programmatically. Bypasses the
  // ExperimentManager auto-match poll, which would require the experimenter's
  // browser session to stay open in parallel with the participants'.
  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: experimenter.address,
  })
  const matchId = await ownerCreateMatch(algorand, variationClient, experimenter.address, participant1.address, participant2.address)

  await playInvestor(page, algorand, participant1, variationAppId, INVESTMENT_ALGO)
  await playTrustee(page, algorand, participant2, variationAppId, RETURN_ALGO)

  const finalMatch = (await variationClient.send.getMatch({ args: { matchId } })).return!

  const E1 = BigInt(E1_ALGO * 1_000_000)
  const E2 = BigInt(E2_ALGO * 1_000_000)
  const investment = BigInt(INVESTMENT_ALGO * 1_000_000)
  const ret = BigInt(RETURN_ALGO * 1_000_000)

  expect(finalMatch.phase).toBe(PHASE_COMPLETED)
  expect(finalMatch.investment).toBe(investment)
  expect(finalMatch.returnAmount).toBe(ret)
  expect(finalMatch.investorPayout).toBe(E1 - investment + ret)
  expect(finalMatch.trusteePayout).toBe(E2 + investment * BigInt(MULTIPLIER) - ret)
  expect(finalMatch.paidOut).toBe(1)
})

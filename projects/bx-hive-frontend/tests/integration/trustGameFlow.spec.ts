import { AlgoAmount } from '@algorandfoundation/algokit-utils'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { describe, expect, it } from 'vitest'
import { deployContracts, enableVariations } from './helpers/deployContracts'
import {
  ROLE_EXPERIMENTER,
  ROLE_PARTICIPANT,
  createMockUsdc,
  enrollParticipant,
  investorDecide,
  optInToAsset,
  ownerCreateMatch,
  registerUser,
  setupExperiment,
  trusteeDecide,
} from './helpers/operations'

const E1 = 1_000_000n
const E2 = 1_000_000n
const MULTIPLIER = 3n
const UNIT = 100_000n
const ESCROW = 5_000_000n
const INVESTMENT = 300_000n
const RETURN = 500_000n

const PHASE_COMPLETED = 2

describe('trust-game flow (integration)', () => {
  const localnet = algorandFixture({ testAccountFunding: AlgoAmount.Algos(50) })

  it('completes a full investor → trustee → results round-trip', async () => {
    await localnet.newScope()
    const algorand = localnet.algorand
    const owner = localnet.context.testAccount
    const investor = await localnet.context.generateAccount({ initialFunds: AlgoAmount.Algos(2) })
    const trustee = await localnet.context.generateAccount({ initialFunds: AlgoAmount.Algos(2) })

    const { registryClient, trustExperimentsClient } = await deployContracts(algorand, owner)
    await enableVariations(algorand, owner, trustExperimentsClient)

    await registerUser(registryClient, owner, ROLE_EXPERIMENTER, 'Owner')
    await registerUser(registryClient, investor, ROLE_PARTICIPANT, 'Investor')
    await registerUser(registryClient, trustee, ROLE_PARTICIPANT, 'Trustee')

    const { variationClient } = await setupExperiment(algorand, trustExperimentsClient, owner, {
      e1: E1,
      e2: E2,
      multiplier: MULTIPLIER,
      unit: UNIT,
      escrow: ESCROW,
    })

    await enrollParticipant(algorand, variationClient, investor)
    await enrollParticipant(algorand, variationClient, trustee)

    const matchId = await ownerCreateMatch(algorand, variationClient, owner, investor, trustee)

    await investorDecide(variationClient, investor, matchId, INVESTMENT)
    await trusteeDecide(variationClient, trustee, matchId, RETURN)

    const finalMatch = (await variationClient.send.getMatch({ args: { matchId } })).return!
    expect(finalMatch.phase).toBe(PHASE_COMPLETED)
    expect(finalMatch.investment).toBe(INVESTMENT)
    expect(finalMatch.returnAmount).toBe(RETURN)
    expect(finalMatch.investorPayout).toBe(E1 - INVESTMENT + RETURN)
    expect(finalMatch.trusteePayout).toBe(E2 + INVESTMENT * MULTIPLIER - RETURN)
    expect(finalMatch.paidOut).toBe(1)
  }, 60_000)

  it('completes the round-trip with a mock USDC payout asset', async () => {
    await localnet.newScope()
    const algorand = localnet.algorand
    const owner = localnet.context.testAccount
    const investor = await localnet.context.generateAccount({ initialFunds: AlgoAmount.Algos(2) })
    const trustee = await localnet.context.generateAccount({ initialFunds: AlgoAmount.Algos(2) })

    // Owner mints mock USDC and is auto-opted-in as creator.
    const usdcAssetId = await createMockUsdc(algorand, owner)

    // Participants opt in to USDC so they can receive the payout. In production
    // this is bundled into the join group (PR2); for the integration test we
    // call it directly.
    await optInToAsset(algorand, investor, usdcAssetId)
    await optInToAsset(algorand, trustee, usdcAssetId)

    const { registryClient, trustExperimentsClient } = await deployContracts(algorand, owner)
    await enableVariations(algorand, owner, trustExperimentsClient)

    await registerUser(registryClient, owner, ROLE_EXPERIMENTER, 'Owner')
    await registerUser(registryClient, investor, ROLE_PARTICIPANT, 'Investor')
    await registerUser(registryClient, trustee, ROLE_PARTICIPANT, 'Trustee')

    const { variationClient } = await setupExperiment(algorand, trustExperimentsClient, owner, {
      e1: E1,
      e2: E2,
      multiplier: MULTIPLIER,
      unit: UNIT,
      escrow: ESCROW,
      assetId: usdcAssetId,
    })

    await enrollParticipant(algorand, variationClient, investor)
    await enrollParticipant(algorand, variationClient, trustee)

    const matchId = await ownerCreateMatch(algorand, variationClient, owner, investor, trustee)

    await investorDecide(variationClient, investor, matchId, INVESTMENT)
    await trusteeDecide(variationClient, trustee, matchId, RETURN)

    const finalMatch = (await variationClient.send.getMatch({ args: { matchId } })).return!
    expect(finalMatch.phase).toBe(PHASE_COMPLETED)
    expect(finalMatch.investorPayout).toBe(E1 - INVESTMENT + RETURN)
    expect(finalMatch.trusteePayout).toBe(E2 + INVESTMENT * MULTIPLIER - RETURN)
    expect(finalMatch.paidOut).toBe(1)

    // Payouts arrived as USDC balances, not ALGO.
    const investorUsdc = await algorand.client.algod.accountAssetInformation(investor, usdcAssetId)
    const trusteeUsdc = await algorand.client.algod.accountAssetInformation(trustee, usdcAssetId)
    expect(investorUsdc.assetHolding!.amount).toBe(E1 - INVESTMENT + RETURN)
    expect(trusteeUsdc.assetHolding!.amount).toBe(E2 + INVESTMENT * MULTIPLIER - RETURN)
  }, 60_000)
})

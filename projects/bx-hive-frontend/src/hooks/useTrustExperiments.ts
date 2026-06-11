import { AlgoAmount, AlgorandClient, getApplicationAddress, microAlgo } from '@algorandfoundation/algokit-utils'
import { useCallback } from 'react'
import type { ExperimentGroup, TrustExperimentsClient, VariationInfo } from '../contracts/TrustExperiments'
import { isAccountOptedInToAsset } from '../utils/algorand'
import { useAlgorand } from './useAlgorand'

export type { ExperimentGroup, VariationInfo }

export interface VariationParams {
  label: string
  /** E1 endowment in base units of the payout asset (E1 * 10^decimals) */
  e1: bigint
  /** E2 endowment in base units of the payout asset */
  e2: bigint
  multiplier: bigint
  /** Unit size in base units of the payout asset */
  unit: bigint
  /** Asset ID — 0 for ALGO */
  assetId: bigint
  /** Max participants per variation — 0 for unlimited */
  maxParticipants?: bigint
  /** Pre-funded escrow in base units of the payout asset to deposit at creation */
  escrowBaseUnits: bigint
}

// MBR funded to the new variation app account: 0.1 ALGO base + 0.1 ALGO per
// asset opt-in. Mirrors the constants in TrustExperiments.create_variation.
const VAR_APP_MBR_ALGO = 100_000
const VAR_APP_MBR_ASA = 200_000

/**
 * Builds the MBR + escrow + (optional) opt-in legs for a create-variation /
 * create-experiment-with-variation call group. Returns prebuilt txn args
 * suitable for the typed client's app-call params; also returns a list of
 * additional appcall/asset-optin params that must be prepended in the group.
 */
interface CreateGroupLegs {
  mbrPayment: Awaited<ReturnType<AlgorandClient['createTransaction']['payment']>>
  escrowFunding:
    | Awaited<ReturnType<AlgorandClient['createTransaction']['payment']>>
    | Awaited<ReturnType<AlgorandClient['createTransaction']['assetTransfer']>>
  trustExperimentsOptInCall: Awaited<ReturnType<TrustExperimentsClient['params']['optInToAsset']>> | null
  needsExperimenterOptIn: boolean
}

async function buildCreateGroupLegs(
  algorand: AlgorandClient,
  trustExperimentsClient: TrustExperimentsClient,
  activeAddress: string,
  params: VariationParams,
): Promise<CreateGroupLegs> {
  const trustExperimentsAppAddr = getApplicationAddress(trustExperimentsClient.appId)
  const assetId = params.assetId

  const mbrPayment = await algorand.createTransaction.payment({
    sender: activeAddress,
    receiver: trustExperimentsAppAddr,
    amount: AlgoAmount.MicroAlgos(assetId === 0n ? VAR_APP_MBR_ALGO : VAR_APP_MBR_ASA),
  })

  const escrowFunding =
    assetId === 0n
      ? await algorand.createTransaction.payment({
          sender: activeAddress,
          receiver: trustExperimentsAppAddr,
          amount: AlgoAmount.MicroAlgos(Number(params.escrowBaseUnits)),
        })
      : await algorand.createTransaction.assetTransfer({
          sender: activeAddress,
          receiver: trustExperimentsAppAddr.toString(),
          assetId,
          amount: params.escrowBaseUnits,
        })

  let trustExperimentsOptInCall: CreateGroupLegs['trustExperimentsOptInCall'] = null
  let needsExperimenterOptIn = false

  if (assetId > 0n) {
    const teOptedIn = await isAccountOptedInToAsset(algorand, trustExperimentsAppAddr.toString(), assetId)
    if (!teOptedIn) {
      const optInMbr = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: trustExperimentsAppAddr,
        amount: AlgoAmount.MicroAlgos(100_000),
      })
      trustExperimentsOptInCall = await trustExperimentsClient.params.optInToAsset({
        sender: activeAddress,
        args: { assetId, mbrPayment: optInMbr },
        maxFee: microAlgo(3_000),
      })
    }
    needsExperimenterOptIn = !(await isAccountOptedInToAsset(algorand, activeAddress, assetId))
  }

  return { mbrPayment, escrowFunding, trustExperimentsOptInCall, needsExperimenterOptIn }
}

/**
 * Hook for interacting with the TrustExperiments contract (Layer 2).
 * Handles experiment group creation and variation spawning.
 */
export function useTrustExperiments() {
  const { algorand, trustExperimentsClient, activeAddress } = useAlgorand()

  /**
   * Creates a new experiment group on-chain.
   * Returns the exp_id (uint32).
   */
  const createExperiment = useCallback(
    async (name: string): Promise<number> => {
      if (!trustExperimentsClient || !activeAddress) throw new Error('Wallet not connected')
      const result = await trustExperimentsClient.send.createExperiment({
        args: { name },
      })
      return result.return!
    },
    [trustExperimentsClient, activeAddress],
  )

  /**
   * Atomically creates a new experiment group and its first variation in one transaction.
   * For ASA experiments, the group also conditionally prepends a TrustExperiments
   * asset opt-in and the experimenter's own asset opt-in so the whole flow ships
   * in a single wallet signature.
   * Returns { expId, appId }.
   */
  const createExperimentWithVariation = useCallback(
    async (name: string, params: VariationParams): Promise<{ expId: number; appId: bigint }> => {
      if (!trustExperimentsClient || !algorand || !activeAddress) throw new Error('Wallet not connected')
      const legs = await buildCreateGroupLegs(algorand, trustExperimentsClient, activeAddress, params)

      const composer = algorand.newGroup({ coverAppCallInnerTransactionFees: true, populateAppCallResources: true })
      if (legs.trustExperimentsOptInCall) composer.addAppCallMethodCall(legs.trustExperimentsOptInCall)
      if (legs.needsExperimenterOptIn) composer.addAssetOptIn({ sender: activeAddress, assetId: params.assetId })
      composer.addAppCallMethodCall(
        await trustExperimentsClient.params.createExperimentWithVariation({
          sender: activeAddress,
          args: {
            name,
            label: params.label,
            e1: params.e1,
            e2: params.e2,
            multiplier: params.multiplier,
            unit: params.unit,
            assetId: params.assetId,
            maxParticipants: params.maxParticipants ?? 0n,
            mbrPayment: legs.mbrPayment,
            escrowFunding: legs.escrowFunding,
          },
          maxFee: microAlgo(12_000),
        }),
      )

      const result = await composer.send()
      const returns = result.returns ?? []
      const lastReturn = returns[returns.length - 1]
      const [expId, appId] = lastReturn.returnValue as [bigint, bigint]
      return { expId: Number(expId), appId: BigInt(appId) }
    },
    [trustExperimentsClient, algorand, activeAddress],
  )

  /**
   * Spawns a new TrustVariation contract for the given experiment.
   * Bytecode is read from on-chain box storage by TrustExperiments.
   * Returns the app_id (bigint) of the newly created TrustVariation contract.
   */
  const createVariation = useCallback(
    async (expId: number, params: VariationParams): Promise<bigint> => {
      if (!trustExperimentsClient || !algorand || !activeAddress) throw new Error('Wallet not connected')
      const legs = await buildCreateGroupLegs(algorand, trustExperimentsClient, activeAddress, params)

      const composer = algorand.newGroup({ coverAppCallInnerTransactionFees: true, populateAppCallResources: true })
      if (legs.trustExperimentsOptInCall) composer.addAppCallMethodCall(legs.trustExperimentsOptInCall)
      if (legs.needsExperimenterOptIn) composer.addAssetOptIn({ sender: activeAddress, assetId: params.assetId })
      composer.addAppCallMethodCall(
        await trustExperimentsClient.params.createVariation({
          sender: activeAddress,
          args: {
            expId,
            label: params.label,
            e1: params.e1,
            e2: params.e2,
            multiplier: params.multiplier,
            unit: params.unit,
            assetId: params.assetId,
            maxParticipants: params.maxParticipants ?? 0n,
            mbrPayment: legs.mbrPayment,
            escrowFunding: legs.escrowFunding,
          },
          maxFee: microAlgo(12_000),
        }),
      )

      const result = await composer.send()
      const returns = result.returns ?? []
      const lastReturn = returns[returns.length - 1]
      return lastReturn.returnValue as bigint
    },
    [trustExperimentsClient, algorand, activeAddress],
  )

  /**
   * Fetches a single ExperimentGroup by exp_id.
   */
  const getExperiment = useCallback(
    async (expId: number): Promise<ExperimentGroup> => {
      if (!trustExperimentsClient) throw new Error('Wallet not connected')
      const result = await trustExperimentsClient.send.getExperiment({
        args: { expId },
      })
      return result.return!
    },
    [trustExperimentsClient],
  )

  /**
   * Fetches a VariationInfo by exp_id + var_id.
   */
  const getVariation = useCallback(
    async (expId: number, varId: number): Promise<VariationInfo> => {
      if (!trustExperimentsClient) throw new Error('Wallet not connected')
      const result = await trustExperimentsClient.send.getVariation({
        args: { expId, varId },
      })
      return result.return!
    },
    [trustExperimentsClient],
  )

  /**
   * Lists all experiments using the box state map accessor.
   */
  const listExperiments = useCallback(async (): Promise<ExperimentGroup[]> => {
    if (!trustExperimentsClient) return []
    const map = await trustExperimentsClient.state.box.experiments.getMap()
    return Array.from(map.values())
  }, [trustExperimentsClient])

  /**
   * Lists all variations for an experiment by iterating var_id 1..count.
   */
  const listVariations = useCallback(
    async (expId: number, count: number): Promise<VariationInfo[]> => {
      if (!trustExperimentsClient) return []
      const results = await Promise.allSettled(Array.from({ length: count }, (_, i) => getVariation(expId, i)))
      return results.filter((r): r is PromiseFulfilledResult<VariationInfo> => r.status === 'fulfilled').map((r) => r.value)
    },
    [trustExperimentsClient, getVariation],
  )

  return { createExperiment, createExperimentWithVariation, createVariation, getExperiment, getVariation, listExperiments, listVariations }
}

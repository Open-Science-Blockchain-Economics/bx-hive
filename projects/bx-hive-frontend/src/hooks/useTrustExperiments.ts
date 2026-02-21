import { useCallback } from 'react'
import type { ExperimentGroup, VariationInfo } from '../contracts/TrustExperiments'
import { getTrustVariationPrograms } from '../utils/compilePrograms'
import { useAlgorand } from './useAlgorand'

export type { ExperimentGroup, VariationInfo }

export interface VariationParams {
  label: string
  /** E1 endowment in microAlgo (E1 ALGO * 1_000_000) */
  e1: bigint
  /** E2 endowment in microAlgo */
  e2: bigint
  multiplier: bigint
  /** Unit size in microAlgo */
  unit: bigint
  /** Asset ID — 0 for ALGO */
  assetId: bigint
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
   * Spawns a new TrustVariation contract for the given experiment.
   * Compiles the TrustVariation TEAL programs and passes them as bytecode.
   * Returns the app_id (bigint) of the newly created TrustVariation contract.
   */
  const createVariation = useCallback(
    async (expId: number, params: VariationParams): Promise<bigint> => {
      if (!trustExperimentsClient || !algorand || !activeAddress) throw new Error('Wallet not connected')
      const { approval, clear } = await getTrustVariationPrograms(algorand)
      const result = await trustExperimentsClient.send.createVariation({
        args: {
          expId,
          label: params.label,
          approvalProgram: approval,
          clearProgram: clear,
          e1: params.e1,
          e2: params.e2,
          multiplier: params.multiplier,
          unit: params.unit,
          assetId: params.assetId,
        },
      })
      return result.return!
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
   * Lists all experiments by reading experiment_count from global state,
   * then fetching each ExperimentGroup in parallel.
   */
  const listExperiments = useCallback(async (): Promise<ExperimentGroup[]> => {
    if (!trustExperimentsClient || !algorand) return []
    const appId = Number(import.meta.env.VITE_TRUST_EXPERIMENTS_APP_ID ?? 0)
    if (appId === 0) return []

    const appInfo = await algorand.client.algod.getApplicationByID(appId).do()
    const globalState = appInfo.params.globalState ?? []
    const countEntry = globalState.find(
      (s) => Buffer.from(s.key).toString() === 'experiment_count',
    )
    const count = Number(countEntry?.value?.uint ?? 0)
    if (count === 0) return []

    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => getExperiment(i + 1)),
    )
    return results
      .filter((r): r is PromiseFulfilledResult<ExperimentGroup> => r.status === 'fulfilled')
      .map((r) => r.value)
  }, [trustExperimentsClient, algorand, getExperiment])

  return { createExperiment, createVariation, getExperiment, getVariation, listExperiments }
}
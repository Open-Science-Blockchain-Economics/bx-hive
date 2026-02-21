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
  // algorand is used by createVariation for TEAL compilation

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
      const results = await Promise.allSettled(
        Array.from({ length: count }, (_, i) => getVariation(expId, i + 1)),
      )
      return results
        .filter((r): r is PromiseFulfilledResult<VariationInfo> => r.status === 'fulfilled')
        .map((r) => r.value)
    },
    [trustExperimentsClient, getVariation],
  )

  return { createExperiment, createVariation, getExperiment, getVariation, listExperiments, listVariations }
}
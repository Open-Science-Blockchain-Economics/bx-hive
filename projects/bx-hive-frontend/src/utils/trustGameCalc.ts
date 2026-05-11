import type { ParameterVariation } from '../types'

/** Expand parameter variations into factorial combinations */
export function generateVariationCombinations(
  baseParams: Record<string, number | string>,
  variations: ParameterVariation[],
): Record<string, number | string>[] {
  let combinations: Record<string, number | string>[] = [{ ...baseParams }]
  for (const variation of variations) {
    const next: Record<string, number | string>[] = []
    for (const combo of combinations) {
      for (const value of variation.values) {
        next.push({ ...combo, [variation.parameterName]: value })
      }
    }
    combinations = next
  }
  return combinations
}

/** Max escrow in ALGO for one variation given its params and max participants */
export function computeEscrowAlgo(params: Record<string, number | string>, maxParticipants: number): number {
  const e1 = Number(params.E1) || 0
  const m = Number(params.m) || 1
  const e2 = Number(params.E2) || 0
  const numPairs = Math.floor(maxParticipants / 2)
  return (e1 * m + e2) * numPairs
}

/** Match MBR in ALGO for one variation (88,300 microAlgo per match = per pair) */
export function computeMatchMbrAlgo(maxParticipants: number): number {
  const numPairs = Math.floor(maxParticipants / 2)
  return (88_300 * numPairs) / 1_000_000
}

/** Convert trust-game frontend params (ALGO) to contract args (microAlgo) */
export function toVariationParams(params: Record<string, number | string>, label: string, maxParticipants = 0, escrowAlgo = 0) {
  return {
    label,
    e1: BigInt(Math.round(Number(params.E1) * 1_000_000)),
    e2: BigInt(Math.round(Number(params.E2) * 1_000_000)),
    multiplier: BigInt(Math.round(Number(params.m))),
    unit: BigInt(Math.round(Number(params.UNIT) * 1_000_000)),
    assetId: 0n,
    maxParticipants: BigInt(maxParticipants),
    escrowMicroAlgo: BigInt(Math.round(escrowAlgo * 1_000_000)),
  }
}

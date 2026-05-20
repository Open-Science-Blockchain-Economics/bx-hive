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

/**
 * Max escrow in WHOLE units of the payout asset (ALGO, USDC, etc.) for one
 * variation. The math is asset-agnostic — the unit is implied by the asset
 * chosen at variation creation.
 */
export function computeEscrowWhole(params: Record<string, number | string>, maxParticipants: number): number {
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

/**
 * Up-front ALGO the experimenter wallet must hold to submit. Escrow only
 * counts when the payout asset is ALGO; MBR is always ALGO. The ASA balance
 * check for non-ALGO escrows is the experimenter's responsibility (the
 * FundingSummary surfaces a note).
 */
export function computeAlgoRequired(
  combos: Record<string, number | string>[],
  maxParticipants: number,
  isAlgoPayout: boolean,
): { totalEscrowWhole: number; totalMatchMbrAlgo: number; algoRequired: number } {
  const totalEscrowWhole = combos.reduce((sum, c) => sum + computeEscrowWhole(c, maxParticipants), 0)
  const totalMatchMbrAlgo = combos.length * computeMatchMbrAlgo(maxParticipants)
  const algoRequired = (isAlgoPayout ? totalEscrowWhole : 0) + totalMatchMbrAlgo
  return { totalEscrowWhole, totalMatchMbrAlgo, algoRequired }
}

/**
 * Convert trust-game frontend params (whole-units numbers) to contract args
 * (base-units bigints) for the chosen payout asset.
 */
export function toVariationParams(
  params: Record<string, number | string>,
  label: string,
  maxParticipants = 0,
  escrowWhole = 0,
  assetId: bigint = 0n,
  decimals = 6,
) {
  const scale = 10n ** BigInt(decimals)
  const toBase = (n: number): bigint => BigInt(Math.round(n * Number(scale)))
  return {
    label,
    e1: toBase(Number(params.E1)),
    e2: toBase(Number(params.E2)),
    multiplier: BigInt(Math.round(Number(params.m))),
    unit: toBase(Number(params.UNIT)),
    assetId,
    maxParticipants: BigInt(maxParticipants),
    escrowBaseUnits: toBase(escrowWhole),
  }
}

/**
 * Converts a base-units bigint to a whole-units number for display.
 * Pass the asset's decimals (6 for ALGO, USDC; varies for other ASAs).
 * Examples:
 *   baseUnitsToWhole(100_000_000n, 6) → 100
 *   baseUnitsToWhole(1_000n, 3)       → 1
 */
export function baseUnitsToWhole(base: bigint, decimals: number): number {
  return Number(base) / Math.pow(10, decimals)
}

/**
 * Converts a whole-units number to a base-units bigint for on-chain submission.
 * Pass the asset's decimals (6 for ALGO, USDC; varies for other ASAs).
 * Example:
 *   wholeToBaseUnits(100, 6) → 100_000_000n
 */
export function wholeToBaseUnits(whole: number, decimals: number): bigint {
  return BigInt(Math.round(whole * Math.pow(10, decimals)))
}

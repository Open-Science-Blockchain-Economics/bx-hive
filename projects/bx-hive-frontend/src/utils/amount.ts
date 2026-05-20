/**
 * Converts a base-units bigint to a whole-units number for display.
 * Pass the asset's decimals (6 for ALGO, USDC; varies for other ASAs).
 *
 * Precision: result is a JS number, so it loses precision when the integer
 * part of the base value exceeds 2^53. Safe for the 6-decimal assets this
 * project supports today; for hypothetical 18-decimal assets the integer part
 * runs out of precision around 9M whole units.
 *
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
 *
 * Precision: input is a JS number, so fractional inputs near machine epsilon
 * round to the nearest base unit. Safe at <=8 decimals; for high-decimal assets
 * users should enter whole or near-whole amounts.
 *
 * Example:
 *   wholeToBaseUnits(100, 6) → 100_000_000n
 */
export function wholeToBaseUnits(whole: number, decimals: number): bigint {
  return BigInt(Math.round(whole * Math.pow(10, decimals)))
}

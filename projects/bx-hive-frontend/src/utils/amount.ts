/**
 * Converts a microAlgo bigint to an ALGO number for display.
 * e.g. 100_000_000n → 100
 */
export function microAlgoToAlgo(microAlgo: bigint): number {
  return Number(microAlgo) / 1_000_000
}

/**
 * Converts an ALGO number to microAlgo bigint for on-chain submission.
 * e.g. 100 → 100_000_000n
 */
export function algoToMicroAlgo(algo: number): bigint {
  return BigInt(Math.round(algo * 1_000_000))
}
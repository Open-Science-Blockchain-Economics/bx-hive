import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import approvalTeal from '../contracts/TrustVariation.approval.teal?raw'
import clearTeal from '../contracts/TrustVariation.clear.teal?raw'

let cached: { approval: Uint8Array; clear: Uint8Array } | null = null

/**
 * Lazily compiles and caches the TrustVariation TEAL programs.
 * These are required as arguments to TrustExperiments.createVariation(),
 * which spawns a new TrustVariation contract via AVM inner transaction.
 */
export async function getTrustVariationPrograms(algorand: AlgorandClient): Promise<{ approval: Uint8Array; clear: Uint8Array }> {
  if (!cached) {
    const algod = algorand.client.algod
    const [approvalResult, clearResult] = await Promise.all([
      algod.compile(approvalTeal).do(),
      algod.compile(clearTeal).do(),
    ])
    cached = {
      approval: new Uint8Array(Buffer.from(approvalResult.result, 'base64')),
      clear: new Uint8Array(Buffer.from(clearResult.result, 'base64')),
    }
  }
  return cached
}
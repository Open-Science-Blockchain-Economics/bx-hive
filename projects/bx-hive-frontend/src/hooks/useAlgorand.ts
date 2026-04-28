import { useWallet } from '@txnlab/use-wallet-react'
import { useCallback, useMemo } from 'react'
import { encodeTransactionRaw } from '@algorandfoundation/algokit-utils/transact'
import { getAlgorandClient, getRegistryClient, getTrustExperimentsClient, getTrustVariationClient } from '../utils/algorand'
import { useNetworkConfig } from '../providers/NetworkProvider'

type WalletSigner = (txnGroup: unknown[], indexesToSign: number[]) => Promise<(Uint8Array | null)[]>
type AlgokitSigner = (txnGroup: unknown[], indexesToSign: number[]) => Promise<Uint8Array[]>

// Bridge use-wallet's signer to algokit-utils v10. Two things matter:
//   1. v10 Transactions have no .toByte() that use-wallet's default path expects;
//      pre-encode with encodeTransactionRaw and route use-wallet into its
//      processEncodedTxns branch.
//   2. use-wallet returns (Uint8Array | null)[] (null = "this wallet didn't sign that index").
//      algokit-utils v10's composer feeds the result into a single-buffer msgpack decode and
//      chokes on nulls with `Extra N of M byte(s) found at buffer[1]`. Filter them out — match
//      the working pattern from algokit-lora's wallet-provider-inner.tsx.
function adaptWalletSigner(walletSigner: unknown): AlgokitSigner {
  return async (txnGroup, indexesToSign) => {
    const encoded = (txnGroup as Array<Parameters<typeof encodeTransactionRaw>[0]>).map((t) => encodeTransactionRaw(t))
    const signResults = await (walletSigner as WalletSigner)(encoded, indexesToSign)
    return signResults.filter((r): r is Uint8Array => r !== null)
  }
}

/**
 * Foundation hook — wires the active wallet signer into the AlgorandClient
 * and exposes typed contract client getters.
 *
 * Returns null clients when no wallet is connected.
 */
export function useAlgorand() {
  const { activeAddress, transactionSigner, isReady } = useWallet()
  const { configVersion } = useNetworkConfig()

  const algorand = useMemo(() => {
    if (!activeAddress) return null
    const client = getAlgorandClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.setSigner(activeAddress, adaptWalletSigner(transactionSigner) as any)
    return client
  }, [activeAddress, transactionSigner, configVersion])

  const registryClient = useMemo(
    () => (algorand && activeAddress ? getRegistryClient(algorand, activeAddress) : null),
    [algorand, activeAddress],
  )

  const trustExperimentsClient = useMemo(
    () => (algorand && activeAddress ? getTrustExperimentsClient(algorand, activeAddress) : null),
    [algorand, activeAddress],
  )

  const getTrustVariationClientFn = useCallback(
    (appId: bigint) => (algorand && activeAddress ? getTrustVariationClient(algorand, appId, activeAddress) : null),
    [algorand, activeAddress],
  )

  return {
    algorand,
    activeAddress: activeAddress ?? null,
    isReady,
    isConnected: Boolean(activeAddress),
    registryClient,
    trustExperimentsClient,
    getTrustVariationClient: getTrustVariationClientFn,
  }
}

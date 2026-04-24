import { useWallet } from '@txnlab/use-wallet-react'
import { useCallback, useMemo } from 'react'
import { encodeTransaction } from '@algorandfoundation/algokit-utils/transact'
import { getAlgorandClient, getRegistryClient, getTrustExperimentsClient, getTrustVariationClient } from '../utils/algorand'
import { useNetworkConfig } from '../providers/NetworkProvider'

type AnySigner = (txnGroup: unknown[], indexesToSign: number[]) => Promise<Uint8Array[]>

// v10 Transactions have no .toByte() but use-wallet's default Transaction-path calls it.
// Pre-encode with v10's encodeTransaction and hand bytes over, routing use-wallet into
// its processEncodedTxns branch (which uses algosdk internally inside its own sandbox).
function adaptWalletSigner(walletSigner: unknown): AnySigner {
  return async (txnGroup, indexesToSign) => {
    const encoded = (txnGroup as Array<Parameters<typeof encodeTransaction>[0]>).map((t) => encodeTransaction(t))
    return (walletSigner as AnySigner)(encoded, indexesToSign)
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

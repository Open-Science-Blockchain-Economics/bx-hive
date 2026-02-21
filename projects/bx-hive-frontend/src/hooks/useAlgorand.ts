import { useWallet } from '@txnlab/use-wallet-react'
import { useMemo } from 'react'
import { getAlgorandClient, getRegistryClient, getTrustExperimentsClient, getTrustVariationClient } from '../utils/algorand'

/**
 * Foundation hook — wires the active wallet signer into the AlgorandClient
 * and exposes typed contract client getters.
 *
 * Returns null clients when no wallet is connected.
 */
export function useAlgorand() {
  const { activeAddress, transactionSigner, isReady } = useWallet()

  const algorand = useMemo(() => {
    if (!activeAddress) return null
    const client = getAlgorandClient()
    client.setSigner(activeAddress, transactionSigner)
    return client
  }, [activeAddress, transactionSigner])

  return {
    algorand,
    activeAddress: activeAddress ?? null,
    isReady,
    isConnected: Boolean(activeAddress),
    registryClient: algorand && activeAddress ? getRegistryClient(algorand, activeAddress) : null,
    trustExperimentsClient: algorand && activeAddress ? getTrustExperimentsClient(algorand, activeAddress) : null,
    getTrustVariationClient: (appId: bigint) =>
      algorand && activeAddress ? getTrustVariationClient(algorand, appId, activeAddress) : null,
  }
}
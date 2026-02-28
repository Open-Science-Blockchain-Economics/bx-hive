import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import algosdk from 'algosdk'
import { useCallback } from 'react'
import type { Match, VariationConfig } from '../contracts/TrustVariation'
import { useAlgorand } from './useAlgorand'

export type { Match, VariationConfig }

// Phase constants matching contract values
export const PHASE_INVESTOR_DECISION = 0
export const PHASE_TRUSTEE_DECISION = 1
export const PHASE_COMPLETED = 2

// Status constants matching contract values
export const STATUS_ACTIVE = 0
export const STATUS_CLOSED = 1
export const STATUS_COMPLETED = 2

/**
 * Hook for interacting with TrustVariation contracts (Layer 3).
 * Each TrustVariation is a separate contract instance identified by its appId.
 */
export function useTrustVariation() {
  const { algorand, activeAddress, getTrustVariationClient } = useAlgorand()

  /**
   * Deposits ALGO escrow into a TrustVariation contract.
   * Sends a grouped payment + depositEscrow method call.
   */
  const depositEscrow = useCallback(
    async (appId: bigint, amountAlgo: number): Promise<void> => {
      if (!algorand || !activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')

      const appAddress = algosdk.getApplicationAddress(appId)
      const paymentTxn = algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appAddress,
        amount: AlgoAmount.Algos(amountAlgo),
      })

      await client.send.depositEscrow({
        args: { payment: paymentTxn },
      })
    },
    [algorand, activeAddress, getTrustVariationClient],
  )

  /**
   * Adds subject wallet addresses to a variation (owner-only).
   */
  const addSubjects = useCallback(
    async (appId: bigint, addresses: string[]): Promise<void> => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      await client.send.addSubjects({ args: { addresses } })
    },
    [activeAddress, getTrustVariationClient],
  )

  /**
   * Creates a match pairing an investor and trustee (owner-only).
   * Returns the match_id (uint32).
   */
  const createMatch = useCallback(
    async (appId: bigint, investor: string, trustee: string): Promise<number> => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      const result = await client.send.createMatch({ args: { investor, trustee } })
      return result.return!
    },
    [activeAddress, getTrustVariationClient],
  )

  /**
   * Submits the investor's decision (amount to invest in microAlgo).
   */
  const submitInvestorDecision = useCallback(
    async (appId: bigint, matchId: number, investmentMicroAlgo: bigint): Promise<void> => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      await client.send.submitInvestorDecision({
        args: { matchId, investment: investmentMicroAlgo },
      })
    },
    [activeAddress, getTrustVariationClient],
  )

  /**
   * Submits the trustee's decision (amount to return in microAlgo).
   * Triggers ALGO payouts to both players via inner transactions.
   */
  const submitTrusteeDecision = useCallback(
    async (appId: bigint, matchId: number, returnAmountMicroAlgo: bigint): Promise<void> => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      await client.send.submitTrusteeDecision({
        args: { matchId, returnAmount: returnAmountMicroAlgo },
      })
    },
    [activeAddress, getTrustVariationClient],
  )

  /**
   * Fetches the full Match struct by match_id.
   */
  const getMatch = useCallback(
    async (appId: bigint, matchId: number): Promise<Match> => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      const result = await client.send.getMatch({ args: { matchId } })
      return result.return!
    },
    [activeAddress, getTrustVariationClient],
  )

  /**
   * Looks up the match_id for the connected wallet address, then fetches the full Match.
   * Returns null if the address has no match in this variation.
   */
  const getPlayerMatch = useCallback(
    async (appId: bigint, address: string): Promise<Match | null> => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      try {
        const matchIdResult = await client.send.getPlayerMatch({ args: { addr: address } })
        const matchId = matchIdResult.return!
        return getMatch(appId, matchId)
      } catch {
        return null
      }
    },
    [activeAddress, getTrustVariationClient, getMatch],
  )

  /**
   * Self-enroll the connected wallet into a TrustVariation.
   * Sends a grouped MBR payment + selfEnroll method call.
   */
  const selfEnroll = useCallback(
    async (appId: bigint): Promise<void> => {
      if (!algorand || !activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')

      const appAddress = algosdk.getApplicationAddress(appId)
      const mbrPayment = algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appAddress,
        amount: AlgoAmount.MicroAlgos(16_900),
      })

      await client.send.selfEnroll({
        args: { mbrPayment },
        coverAppCallInnerTransactionFees: true,
        maxFee: AlgoAmount.MicroAlgos(3_000),
      })
    },
    [algorand, activeAddress, getTrustVariationClient],
  )

  /**
   * Returns all enrolled subjects for a variation (subjects BoxMap read).
   */
  const getEnrolledSubjects = useCallback(
    async (appId: bigint): Promise<Array<{ address: string; enrolled: number; assigned: number }>> => {
      const client = getTrustVariationClient(appId)
      if (!client) return []
      const map = await client.state.box.subjects.getMap()
      return Array.from(map.entries()).map(([address, info]) => ({ address, ...info }))
    },
    [getTrustVariationClient],
  )

  /**
   * Returns all matches for a variation (matches BoxMap read).
   */
  const getMatches = useCallback(
    async (appId: bigint): Promise<Match[]> => {
      const client = getTrustVariationClient(appId)
      if (!client) return []
      const map = await client.state.box.matches.getMap()
      return Array.from(map.values())
    },
    [getTrustVariationClient],
  )

  /**
   * Checks if an address is enrolled as a subject in a variation (subjects box read).
   */
  const isSubjectEnrolled = useCallback(
    async (appId: bigint, address: string): Promise<boolean> => {
      const client = getTrustVariationClient(appId)
      if (!client) return false
      const info = await client.state.box.subjects.value(address)
      return info !== undefined && info.enrolled === 1
    },
    [getTrustVariationClient],
  )

  /**
   * Fetches the current subject count for a variation.
   */
  const getSubjectCount = useCallback(
    async (appId: bigint): Promise<number> => {
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      const result = await client.send.getSubjectCount({ args: {} })
      return Number(result.return!)
    },
    [getTrustVariationClient],
  )

  /**
   * Fetches the VariationConfig (e1, e2, multiplier, unit, assetId, status).
   */
  const getConfig = useCallback(
    async (appId: bigint): Promise<VariationConfig> => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      const result = await client.send.getConfig({ args: {} })
      return result.return!
    },
    [activeAddress, getTrustVariationClient],
  )

  /**
   * Ends a variation, returning any remaining escrow to the owner.
   * Can be called after all matches complete or to force-end early.
   */
  const endVariation = useCallback(
    async (appId: bigint): Promise<void> => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      await client.send.endVariation({
        args: {},
        coverAppCallInnerTransactionFees: true,
        maxFee: AlgoAmount.MicroAlgos(3_000),
      })
    },
    [activeAddress, getTrustVariationClient],
  )

  return {
    depositEscrow,
    addSubjects,
    selfEnroll,
    createMatch,
    submitInvestorDecision,
    submitTrusteeDecision,
    getMatch,
    getPlayerMatch,
    getConfig,
    getSubjectCount,
    getEnrolledSubjects,
    getMatches,
    isSubjectEnrolled,
    endVariation,
  }
}
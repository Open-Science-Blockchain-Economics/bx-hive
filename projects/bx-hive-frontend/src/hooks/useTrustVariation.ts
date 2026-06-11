import { AlgoAmount, getApplicationAddress, microAlgo } from '@algorandfoundation/algokit-utils'
import { useCallback } from 'react'
import type { Match, VariationConfig } from '../contracts/TrustVariation'
import { isAccountOptedInToAsset } from '../utils/algorand'
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

      const appAddress = getApplicationAddress(appId)
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
   * Adds participant wallet addresses to a variation (owner-only).
   * Sends a grouped MBR payment (16,900 microAlgo per participant) for participant boxes.
   */
  const addParticipants = useCallback(
    async (appId: bigint, addresses: string[]): Promise<void> => {
      if (!algorand || !activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')

      const appAddress = getApplicationAddress(appId)
      const mbrPayment = algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appAddress,
        amount: AlgoAmount.MicroAlgos(16_900 * addresses.length),
      })

      await client.send.addParticipants({ args: { addresses, mbrPayment } })
    },
    [algorand, activeAddress, getTrustVariationClient],
  )

  /**
   * Creates a match pairing an investor and trustee (owner-only).
   * Sends a grouped MBR payment (88,300 microAlgo) for match + player_match boxes.
   * Returns the match_id (uint32).
   */
  const createMatch = useCallback(
    async (appId: bigint, investor: string, trustee: string): Promise<number> => {
      if (!algorand || !activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')

      const appAddress = getApplicationAddress(appId)
      const mbrPayment = algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appAddress,
        amount: AlgoAmount.MicroAlgos(88_300),
      })

      const result = await client.send.createMatch({ args: { investor, trustee, mbrPayment } })
      return result.return!
    },
    [algorand, activeAddress, getTrustVariationClient],
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
        coverAppCallInnerTransactionFees: true,
        maxFee: AlgoAmount.MicroAlgos(3_000),
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
   * Self-enroll the connected wallet into a TrustVariation. For ASA variations
   * (assetId > 0) the group conditionally prepends an assetOptIn for the
   * participant so the join + opt-in lands in a single wallet signature.
   */
  const selfEnroll = useCallback(
    async (appId: bigint): Promise<void> => {
      if (!algorand || !activeAddress) throw new Error('Wallet not connected')
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')

      // Look up the variation's payout asset so we know whether to bundle an opt-in.
      const configResult = await client.send.getConfig({ args: {} })
      const assetId = configResult.return?.assetId ?? 0n
      const needsOptIn = assetId > 0n && !(await isAccountOptedInToAsset(algorand, activeAddress, assetId))

      const appAddress = getApplicationAddress(appId)
      const mbrPayment = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appAddress,
        amount: AlgoAmount.MicroAlgos(16_900),
      })

      const composer = algorand.newGroup({ coverAppCallInnerTransactionFees: true, populateAppCallResources: true })
      if (needsOptIn) composer.addAssetOptIn({ sender: activeAddress, assetId })
      composer.addAppCallMethodCall(
        await client.params.selfEnroll({
          sender: activeAddress,
          args: { mbrPayment },
          maxFee: microAlgo(3_000),
        }),
      )
      await composer.send()
    },
    [algorand, activeAddress, getTrustVariationClient],
  )

  /**
   * Returns all enrolled participants for a variation (participants BoxMap read).
   */
  const getEnrolledParticipants = useCallback(
    async (appId: bigint): Promise<Array<{ address: string; enrolled: number; assigned: number }>> => {
      const client = getTrustVariationClient(appId)
      if (!client) return []
      const map = await client.state.box.participants.getMap()
      // Stable order across polls: the BoxMap read order is non-deterministic, so sort
      // by address (deterministic) to stop the participants table reshuffling on refresh.
      return Array.from(map.entries())
        .map(([address, info]) => ({ address, ...info }))
        .sort((a, b) => a.address.localeCompare(b.address))
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
      return Array.from(map.values()).sort((a, b) => a.matchId - b.matchId)
    },
    [getTrustVariationClient],
  )

  /**
   * Checks if an address is enrolled as a participant in a variation (participants box read).
   */
  const isParticipantEnrolled = useCallback(
    async (appId: bigint, address: string): Promise<boolean> => {
      const client = getTrustVariationClient(appId)
      if (!client) return false
      const info = await client.state.box.participants.value(address)
      return info !== undefined && info.enrolled === 1
    },
    [getTrustVariationClient],
  )

  /**
   * Fetches the current participant count for a variation.
   */
  const getParticipantCount = useCallback(
    async (appId: bigint): Promise<number> => {
      const client = getTrustVariationClient(appId)
      if (!client) throw new Error('Wallet not connected')
      const result = await client.send.getParticipantCount({ args: {} })
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
    addParticipants,
    selfEnroll,
    createMatch,
    submitInvestorDecision,
    submitTrusteeDecision,
    getMatch,
    getPlayerMatch,
    getConfig,
    getParticipantCount,
    getEnrolledParticipants,
    getMatches,
    isParticipantEnrolled,
    endVariation,
  }
}

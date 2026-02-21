import { useCallback } from 'react'
import type { User as ContractUser } from '../contracts/BxHiveRegistry'
import { useAlgorand } from './useAlgorand'

// Role encoding matches contract constants: 0=experimenter, 1=subject
const ROLE_MAP = { experimenter: 0, subject: 1 } as const

export type { ContractUser }

/**
 * Hook for interacting with the BxHiveRegistry contract (Layer 1).
 * Handles user registration and lookup by wallet address.
 */
export function useRegistry() {
  const { registryClient, activeAddress } = useAlgorand()

  /**
   * Registers the connected wallet as a new user in the Registry.
   * Returns the on-chain user_id (uint32).
   */
  const registerUser = useCallback(
    async (role: 'experimenter' | 'subject', name: string): Promise<number> => {
      if (!registryClient || !activeAddress) throw new Error('Wallet not connected')
      const result = await registryClient.send.registerUser({
        args: { role: ROLE_MAP[role], name },
      })
      return result.return!
    },
    [registryClient, activeAddress],
  )

  /**
   * Fetches the User struct for a given wallet address from the Registry.
   * Returns null if the address is not registered.
   */
  const getUser = useCallback(
    async (address: string): Promise<ContractUser | null> => {
      if (!registryClient) throw new Error('Wallet not connected')
      try {
        const result = await registryClient.send.getUser({
          args: { addr: address },
        })
        return result.return ?? null
      } catch {
        // User not found in Registry
        return null
      }
    },
    [registryClient],
  )

  return { registerUser, getUser }
}
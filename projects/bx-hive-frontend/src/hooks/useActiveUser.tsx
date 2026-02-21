import { useWallet } from '@txnlab/use-wallet-react'
import { useState, useCallback, createContext, useContext, useEffect, ReactNode } from 'react'
import type { User, UserRole } from '../types'
import { getAlgorandClient, getRegistryClient } from '../utils/algorand'

const ROLE_REVERSE: Record<number, UserRole> = { 0: 'experimenter', 1: 'subject' }

interface ActiveUserContextType {
  activeUser: User | null
  isLoading: boolean
  /** Re-fetches the user from Registry for the given address. Call after registration. */
  setActiveUser: (address: string) => Promise<void>
  clearActiveUser: () => void
}

const ActiveUserContext = createContext<ActiveUserContextType | undefined>(undefined)

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { activeAddress, transactionSigner } = useWallet()

  const fetchUser = useCallback(
    async (address: string) => {
      try {
        const algorand = getAlgorandClient()
        algorand.setSigner(address, transactionSigner)
        const client = getRegistryClient(algorand, address)
        const result = await client.send.getUser({ args: { addr: address } })
        const contractUser = result.return
        if (contractUser) {
          setActiveUserState({
            id: address,
            name: contractUser.name,
            role: ROLE_REVERSE[contractUser.role] ?? 'subject',
            createdAt: Number(contractUser.createdAt),
            userId: contractUser.userId,
          })
        } else {
          setActiveUserState(null)
        }
      } catch {
        // Address not registered in Registry yet
        setActiveUserState(null)
      }
    },
    [transactionSigner],
  )

  // Auto-fetch user whenever the connected wallet address changes
  useEffect(() => {
    setIsLoading(true)
    if (!activeAddress) {
      setActiveUserState(null)
      setIsLoading(false)
      return
    }
    fetchUser(activeAddress).finally(() => setIsLoading(false))
  }, [activeAddress, fetchUser])

  /** Re-fetches and sets the active user from Registry. Call after successful registration. */
  const setActiveUser = useCallback(
    async (address: string) => {
      setIsLoading(true)
      await fetchUser(address)
      setIsLoading(false)
    },
    [fetchUser],
  )

  const clearActiveUser = useCallback(() => {
    setActiveUserState(null)
  }, [])

  return (
    <ActiveUserContext.Provider value={{ activeUser, isLoading, setActiveUser, clearActiveUser }}>
      {children}
    </ActiveUserContext.Provider>
  )
}

export function useActiveUser() {
  const context = useContext(ActiveUserContext)
  if (context === undefined) {
    throw new Error('useActiveUser must be used within an ActiveUserProvider')
  }
  return context
}
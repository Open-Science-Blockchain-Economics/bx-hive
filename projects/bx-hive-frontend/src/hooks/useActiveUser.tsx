import { useWallet } from '@txnlab/use-wallet-react'
import { useRef, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User, UserRole } from '../types'
import { getAlgorandClient, getRegistryClient } from '../utils/algorand'
import { queryKeys } from '../lib/queryKeys'

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
  const { activeAddress, transactionSigner } = useWallet()
  const queryClient = useQueryClient()

  const signerRef = useRef(transactionSigner)
  useEffect(() => {
    signerRef.current = transactionSigner
  }, [transactionSigner])

  const { data: activeUser = null, isLoading } = useQuery({
    queryKey: queryKeys.activeUser(activeAddress ?? ''),
    queryFn: async (): Promise<User | null> => {
      const algorand = getAlgorandClient()
      algorand.setSigner(activeAddress!, signerRef.current)
      const client = getRegistryClient(algorand, activeAddress!)
      try {
        const result = await client.send.getUser({ args: { addr: activeAddress! } })
        const contractUser = result.return
        if (!contractUser) return null
        return {
          id: activeAddress!,
          name: contractUser.name,
          role: ROLE_REVERSE[contractUser.role] ?? 'subject',
          createdAt: Number(contractUser.createdAt),
          userId: contractUser.userId,
        }
      } catch {
        // Address not registered in Registry yet
        return null
      }
    },
    enabled: !!activeAddress,
  })

  /** Re-fetches and sets the active user from Registry. Call after successful registration. */
  const setActiveUser = useCallback(
    async (_address: string) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.activeUser(activeAddress ?? '') })
    },
    [queryClient, activeAddress],
  )

  const clearActiveUser = useCallback(() => {
    queryClient.setQueryData(queryKeys.activeUser(activeAddress ?? ''), null)
  }, [queryClient, activeAddress])

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
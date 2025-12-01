import { useState, useCallback, createContext, useContext, useEffect, ReactNode } from 'react'
import { getUserById } from '../db'
import type { User } from '../types'

const STORAGE_KEY = 'activeUserId'

interface ActiveUserContextType {
  activeUser: User | null
  isLoading: boolean
  setActiveUser: (userId: string) => Promise<void>
  clearActiveUser: () => void
}

const ActiveUserContext = createContext<ActiveUserContextType | undefined>(undefined)

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load active user from sessionStorage on mount
  useEffect(() => {
    async function loadUser() {
      const userId = sessionStorage.getItem(STORAGE_KEY)
      if (userId) {
        const user = await getUserById(userId)
        setActiveUserState(user || null)
      }
      setIsLoading(false)
    }
    loadUser()
  }, [])

  const setActiveUser = useCallback(async (userId: string) => {
    const user = await getUserById(userId)
    if (user) {
      sessionStorage.setItem(STORAGE_KEY, userId)
      setActiveUserState(user)
    }
  }, [])

  const clearActiveUser = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setActiveUserState(null)
  }, [])

  return (
    <ActiveUserContext.Provider
      value={{
        activeUser,
        isLoading,
        setActiveUser,
        clearActiveUser,
      }}
    >
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
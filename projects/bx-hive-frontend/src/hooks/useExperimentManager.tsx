import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import algosdk from 'algosdk'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { STATUS_ACTIVE } from './useTrustVariation'
import { useAlgorand } from './useAlgorand'

// --- Config types ---

interface ExperimentConfig {
  autoRefresh: boolean
  autoMatch: boolean
}

interface RegisteredVariation {
  appId: bigint
  status: number
}

const DEFAULT_EXP_CONFIG: ExperimentConfig = { autoRefresh: true, autoMatch: false }

const autoMatchStorageKey = (expId: number) => `bxhive:experimentAutoMatch:${expId}`

function readAutoMatchFromStorage(expId: number): boolean {
  try {
    return localStorage.getItem(autoMatchStorageKey(expId)) === 'true'
  } catch {
    return false
  }
}

function writeAutoMatchToStorage(expId: number, value: boolean): void {
  try {
    localStorage.setItem(autoMatchStorageKey(expId), String(value))
  } catch {
    // localStorage unavailable (private mode, quota) — ignore
  }
}

// --- Context interface ---

interface ExperimentManagerContextType {
  getExpConfig: (expId: number) => ExperimentConfig
  setExpConfig: (expId: number, patch: Partial<ExperimentConfig>) => void
  registerExperimentVariations: (expId: number, variations: RegisteredVariation[]) => void
}

const ExperimentManagerContext = createContext<ExperimentManagerContextType | undefined>(undefined)

// --- Provider ---

export function ExperimentManagerProvider({ children }: { children: ReactNode }) {
  const { algorand, activeAddress, getTrustVariationClient } = useAlgorand()

  const [expConfigs, setExpConfigs] = useState<Record<number, ExperimentConfig>>({})
  const [expVariations, setExpVariations] = useState<Record<number, RegisteredVariation[]>>({})

  const processingRef = useRef<Set<string>>(new Set())

  const getExpConfig = useCallback(
    (expId: number): ExperimentConfig => {
      const stored = expConfigs[expId]
      if (stored) return stored
      return { ...DEFAULT_EXP_CONFIG, autoMatch: readAutoMatchFromStorage(expId) }
    },
    [expConfigs],
  )

  const setExpConfig = useCallback(
    (expId: number, patch: Partial<ExperimentConfig>) => {
      setExpConfigs((prev) => {
        const current = prev[expId] ?? { ...DEFAULT_EXP_CONFIG, autoMatch: readAutoMatchFromStorage(expId) }
        const next = { ...current, ...patch }
        if (patch.autoMatch !== undefined && patch.autoMatch !== current.autoMatch) {
          writeAutoMatchToStorage(expId, patch.autoMatch)
        }
        return { ...prev, [expId]: next }
      })
    },
    [],
  )

  const registerExperimentVariations = useCallback((expId: number, variations: RegisteredVariation[]) => {
    setExpVariations((prev) => ({ ...prev, [expId]: variations }))
  }, [])

  const expConfigsRef = useRef(expConfigs)
  useEffect(() => {
    expConfigsRef.current = expConfigs
  }, [expConfigs])

  const expVariationsRef = useRef(expVariations)
  useEffect(() => {
    expVariationsRef.current = expVariations
  }, [expVariations])

  const activeAddressRef = useRef(activeAddress)
  useEffect(() => {
    activeAddressRef.current = activeAddress
  }, [activeAddress])

  const getClientRef = useRef(getTrustVariationClient)
  useEffect(() => {
    getClientRef.current = getTrustVariationClient
  }, [getTrustVariationClient])

  const algorandRef = useRef(algorand)
  useEffect(() => {
    algorandRef.current = algorand
  }, [algorand])

  // --- Auto-match polling ---
  useEffect(() => {
    const id = setInterval(() => {
      if (!activeAddressRef.current) return

      for (const [expIdStr, cfg] of Object.entries(expConfigsRef.current)) {
        if (!cfg.autoMatch) continue
        const expId = Number(expIdStr)
        const variations = expVariationsRef.current[expId] ?? []

        for (const variation of variations) {
          if (variation.status !== STATUS_ACTIVE) continue

          const key = String(variation.appId)
          if (processingRef.current.has(key)) continue

          processingRef.current.add(key)
          const appId = variation.appId

          void (async () => {
            try {
              const client = getClientRef.current(appId)
              const algo = algorandRef.current
              const sender = activeAddressRef.current
              if (!client || !algo || !sender) return

              const map = await client.state.box.subjects.getMap()
              const unassigned = Array.from(map.entries())
                .filter(([, info]) => info.assigned === 0)
                .map(([address]) => address)

              const appAddress = algosdk.getApplicationAddress(appId)

              while (unassigned.length >= 2) {
                const investor = unassigned.shift()!
                const trustee = unassigned.shift()!
                const mbrPayment = algo.createTransaction.payment({
                  sender,
                  receiver: appAddress,
                  amount: AlgoAmount.MicroAlgos(88_300),
                })
                await client.send.createMatch({ args: { investor, trustee, mbrPayment } })
              }
            } catch (err) {
              console.warn(`[AutoMatch] Error processing variation ${key}:`, err)
            } finally {
              processingRef.current.delete(key)
            }
          })()
        }
      }
    }, 5000)

    return () => clearInterval(id)
  }, [])

  return (
    <ExperimentManagerContext.Provider value={{ getExpConfig, setExpConfig, registerExperimentVariations }}>
      {children}
    </ExperimentManagerContext.Provider>
  )
}

// --- Hook ---

export function useExperimentManager() {
  const context = useContext(ExperimentManagerContext)
  if (context === undefined) {
    throw new Error('useExperimentManager must be used within an ExperimentManagerProvider')
  }
  return context
}
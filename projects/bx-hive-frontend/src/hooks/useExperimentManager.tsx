import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAlgorand } from './useAlgorand'

// --- Config types ---

interface ExperimentConfig {
  autoRefresh: boolean
}

interface VariationConfig {
  autoMatch: boolean
}

const DEFAULT_EXP_CONFIG: ExperimentConfig = { autoRefresh: true }
const DEFAULT_VAR_CONFIG: VariationConfig = { autoMatch: false }

// --- Context interface ---

interface ExperimentManagerContextType {
  getExpConfig: (expId: number) => ExperimentConfig
  setExpConfig: (expId: number, patch: Partial<ExperimentConfig>) => void
  getVarConfig: (appId: bigint) => VariationConfig
  setVarConfig: (appId: bigint, patch: Partial<VariationConfig>) => void
}

const ExperimentManagerContext = createContext<ExperimentManagerContextType | undefined>(undefined)

// --- Provider ---

export function ExperimentManagerProvider({ children }: { children: ReactNode }) {
  const { activeAddress, getTrustVariationClient } = useAlgorand()

  const [expConfigs, setExpConfigs] = useState<Record<number, ExperimentConfig>>({})
  const [varConfigs, setVarConfigs] = useState<Record<string, VariationConfig>>({})

  // Prevent concurrent auto-match processing per variation
  const processingRef = useRef<Set<string>>(new Set())

  const getExpConfig = useCallback(
    (expId: number): ExperimentConfig => expConfigs[expId] ?? DEFAULT_EXP_CONFIG,
    [expConfigs],
  )

  const setExpConfig = useCallback(
    (expId: number, patch: Partial<ExperimentConfig>) =>
      setExpConfigs((prev) => ({ ...prev, [expId]: { ...(prev[expId] ?? DEFAULT_EXP_CONFIG), ...patch } })),
    [],
  )

  const getVarConfig = useCallback(
    (appId: bigint): VariationConfig => varConfigs[String(appId)] ?? DEFAULT_VAR_CONFIG,
    [varConfigs],
  )

  const setVarConfig = useCallback(
    (appId: bigint, patch: Partial<VariationConfig>) => {
      const key = String(appId)
      setVarConfigs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? DEFAULT_VAR_CONFIG), ...patch } }))
    },
    [],
  )

  // Keep refs current for use inside setInterval callback
  const varConfigsRef = useRef(varConfigs)
  useEffect(() => {
    varConfigsRef.current = varConfigs
  }, [varConfigs])

  const activeAddressRef = useRef(activeAddress)
  useEffect(() => {
    activeAddressRef.current = activeAddress
  }, [activeAddress])

  const getClientRef = useRef(getTrustVariationClient)
  useEffect(() => {
    getClientRef.current = getTrustVariationClient
  }, [getTrustVariationClient])

  // --- Auto-match polling ---
  useEffect(() => {
    const id = setInterval(() => {
      if (!activeAddressRef.current) return

      const configs = varConfigsRef.current
      for (const [key, cfg] of Object.entries(configs)) {
        if (!cfg.autoMatch) continue
        if (processingRef.current.has(key)) continue

        processingRef.current.add(key)
        const appId = BigInt(key)

        void (async () => {
          try {
            const client = getClientRef.current(appId)
            if (!client) return

            // Fetch unassigned subjects
            const map = await client.state.box.subjects.getMap()
            const unassigned = Array.from(map.entries())
              .filter(([, info]) => info.assigned === 0)
              .map(([address]) => address)

            // FIFO: pair first two, then next two, etc.
            while (unassigned.length >= 2) {
              const investor = unassigned.shift()!
              const trustee = unassigned.shift()!
              await client.send.createMatch({ args: { investor, trustee } })
            }
          } catch (err) {
            console.warn(`[AutoMatch] Error processing variation ${key}:`, err)
          } finally {
            processingRef.current.delete(key)
          }
        })()
      }
    }, 5000)

    return () => clearInterval(id)
  }, [])

  return (
    <ExperimentManagerContext.Provider value={{ getExpConfig, setExpConfig, getVarConfig, setVarConfig }}>
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
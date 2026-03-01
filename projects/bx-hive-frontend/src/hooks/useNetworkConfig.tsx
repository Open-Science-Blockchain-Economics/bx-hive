import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import {
  getAlgodConfigFromViteEnvironment,
  getIndexerConfigFromViteEnvironment,
  getKmdConfigFromViteEnvironment,
} from '../utils/network/getAlgoClientConfigs'
import { resetAlgorandClient } from '../utils/algorand'

const STORAGE_KEY = 'bx-hive-network-config'

export interface ServiceConfig {
  server: string
  port: string | number
  token: string
}

export interface KmdConfig extends ServiceConfig {
  wallet: string
  password: string
}

export interface NetworkConfig {
  algod: ServiceConfig
  indexer: ServiceConfig
  kmd: KmdConfig
}

function getDefaultConfig(): NetworkConfig {
  const algod = getAlgodConfigFromViteEnvironment()
  const indexer = getIndexerConfigFromViteEnvironment()
  const kmd = getKmdConfigFromViteEnvironment()
  return {
    algod: { server: algod.server, port: algod.port, token: algod.token as string },
    indexer: { server: indexer.server, port: indexer.port, token: indexer.token as string },
    kmd: { server: kmd.server, port: kmd.port, token: kmd.token as string, wallet: kmd.wallet, password: kmd.password },
  }
}

function loadConfig(): NetworkConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as NetworkConfig
    }
  } catch {
    // ignore parse errors
  }
  return getDefaultConfig()
}

interface NetworkConfigContextValue {
  networkConfig: NetworkConfig
  updateNetworkConfig: (config: NetworkConfig) => void
  resetToDefaults: () => void
  getDefaults: () => NetworkConfig
}

const NetworkConfigContext = createContext<NetworkConfigContextValue | null>(null)

export function NetworkConfigProvider({ children }: { children: ReactNode }) {
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>(loadConfig)

  const updateNetworkConfig = useCallback((config: NetworkConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setNetworkConfig(config)
    resetAlgorandClient()
  }, [])

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    const defaults = getDefaultConfig()
    setNetworkConfig(defaults)
    resetAlgorandClient()
  }, [])

  const getDefaults = useCallback(() => getDefaultConfig(), [])

  return (
    <NetworkConfigContext.Provider value={{ networkConfig, updateNetworkConfig, resetToDefaults, getDefaults }}>
      {children}
    </NetworkConfigContext.Provider>
  )
}

export function useNetworkConfig() {
  const ctx = useContext(NetworkConfigContext)
  if (!ctx) {
    throw new Error('useNetworkConfig must be used within a NetworkConfigProvider')
  }
  return ctx
}
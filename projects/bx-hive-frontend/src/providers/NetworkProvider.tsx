import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { NetworkConfigBuilder, WalletId, WalletManager } from '@txnlab/use-wallet'
import { WalletProvider } from '@txnlab/use-wallet-react'
import {
  getAlgodConfigFromViteEnvironment,
  getIndexerConfigFromViteEnvironment,
  getKmdConfigFromViteEnvironment,
} from '../utils/network/getAlgoClientConfigs'
import { resetAlgorandClient } from '../utils/algorand'
import { TEST_WALLET_NAME } from '../lib/constants'

const STORAGE_KEY = 'bx-hive-network-config'

export interface ServiceConfig {
  server: string
  port?: string | number
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

function createWalletManager(config: NetworkConfig): WalletManager {
  return new WalletManager({
    wallets: [
      {
        id: WalletId.KMD,
        options: {
          token: config.kmd.token as string,
          baseServer: config.kmd.server,
          port: config.kmd.port,
          wallet: TEST_WALLET_NAME,
        },
      },
      WalletId.PERA,
      WalletId.DEFLY,
    ],
    networks: new NetworkConfigBuilder()
      .localnet({
        algod: {
          token: config.algod.token as string,
          baseServer: config.algod.server,
          port: config.algod.port,
        },
      })
      .build(),
    defaultNetwork: 'localnet',
  })
}

interface NetworkConfigContextValue {
  networkConfig: NetworkConfig
  configVersion: number
  updateNetworkConfig: (config: NetworkConfig) => void
  resetToDefaults: () => void
  getDefaults: () => NetworkConfig
}

const NetworkConfigContext = createContext<NetworkConfigContextValue | null>(null)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>(loadConfig)
  const [configVersion, setConfigVersion] = useState(0)

  const walletManager = useMemo(() => createWalletManager(networkConfig), [configVersion])

  const updateNetworkConfig = useCallback((config: NetworkConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setNetworkConfig(config)
    resetAlgorandClient()
    setConfigVersion((v) => v + 1)
  }, [])

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    const defaults = getDefaultConfig()
    setNetworkConfig(defaults)
    resetAlgorandClient()
    setConfigVersion((v) => v + 1)
  }, [])

  const getDefaults = useCallback(() => getDefaultConfig(), [])

  return (
    <NetworkConfigContext.Provider value={{ networkConfig, configVersion, updateNetworkConfig, resetToDefaults, getDefaults }}>
      <WalletProvider key={configVersion} manager={walletManager}>
        {children}
      </WalletProvider>
    </NetworkConfigContext.Provider>
  )
}

export function useNetworkConfig() {
  const ctx = useContext(NetworkConfigContext)
  if (!ctx) {
    throw new Error('useNetworkConfig must be used within a NetworkProvider')
  }
  return ctx
}

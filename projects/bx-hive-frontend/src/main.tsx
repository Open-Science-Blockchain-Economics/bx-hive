import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NetworkConfigBuilder, WalletId, WalletManager } from '@txnlab/use-wallet'
import { WalletProvider } from '@txnlab/use-wallet-react'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App'
import './styles/App.css'
import { NetworkConfigProvider } from './hooks/useNetworkConfig'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import { TEST_WALLET_NAME } from './lib/constants'

const algodConfig = getAlgodConfigFromViteEnvironment()
const kmdConfig = getKmdConfigFromViteEnvironment()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

function AppFatalFallback({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  const isEnvError = message.includes('Attempt to get default algod configuration')
  return (
    <div className="hero min-h-screen bg-teal-400">
      <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
        <div className="max-w-md">
          <h1 className="text-4xl">Fatal Error</h1>
          <p className="py-4 text-base-content/80">
            {isEnvError
              ? 'Please set up your .env file based on .env.template.'
              : 'The application encountered a critical error.'}
          </p>
          <p className="text-xs font-mono text-base-content/50 break-all bg-base-200 p-2 rounded">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

const walletManager = new WalletManager({
  wallets: [
    {
      id: WalletId.KMD,
      options: {
        token: kmdConfig.token as string,
        baseServer: kmdConfig.server,
        port: kmdConfig.port,
        wallet: TEST_WALLET_NAME,
      },
    },
    WalletId.PERA,
    WalletId.DEFLY,
  ],
  networks: new NetworkConfigBuilder()
    .localnet({
      algod: {
        token: algodConfig.token as string,
        baseServer: algodConfig.server,
        port: algodConfig.port,
      },
    })
    .build(),
  defaultNetwork: 'localnet',
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary fallbackRender={AppFatalFallback}>
      <WalletProvider manager={walletManager}>
        <QueryClientProvider client={queryClient}>
          <NetworkConfigProvider>
            <App />
          </NetworkConfigProvider>
        </QueryClientProvider>
      </WalletProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

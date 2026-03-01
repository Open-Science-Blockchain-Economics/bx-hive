import React from 'react'
import ReactDOM from 'react-dom/client'
import { NetworkConfigBuilder, WalletId, WalletManager } from '@txnlab/use-wallet'
import { WalletProvider } from '@txnlab/use-wallet-react'
import App from './App'
import './styles/App.css'
import ErrorBoundary from './components/ErrorBoundary'
import { NetworkConfigProvider } from './hooks/useNetworkConfig'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

const algodConfig = getAlgodConfigFromViteEnvironment()
const kmdConfig = getKmdConfigFromViteEnvironment()

const walletManager = new WalletManager({
  wallets: [
    {
      id: WalletId.KMD,
      options: {
        token: kmdConfig.token as string,
        baseServer: kmdConfig.server,
        port: kmdConfig.port,
        wallet: kmdConfig.wallet,
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
    <ErrorBoundary>
      <WalletProvider manager={walletManager}>
        <NetworkConfigProvider>
          <App />
        </NetworkConfigProvider>
      </WalletProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

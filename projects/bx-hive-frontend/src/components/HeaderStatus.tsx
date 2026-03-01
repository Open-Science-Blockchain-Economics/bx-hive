import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, useNetwork } from '@txnlab/use-wallet-react'
import { useActiveUser } from '../hooks/useActiveUser'
import ConnectedWallet from './ConnectedWallet'

export default function HeaderStatus() {
  const navigate = useNavigate()
  const { activeAddress, wallets } = useWallet()
  const { activeNetwork } = useNetwork()
  const { activeUser, clearActiveUser } = useActiveUser()

  const handleDisconnect = useCallback(async () => {
    const activeWallet = wallets?.find((w) => w.isActive)
    if (activeWallet) {
      await activeWallet.disconnect()
    }
    clearActiveUser()
    navigate('/')
  }, [wallets, clearActiveUser, navigate])

  // No wallet connected — show connect dropdown
  if (!activeAddress) {
    return (
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-outline btn-sm w-40">
          Connect Wallet
        </label>
        <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-50">
          {wallets?.map((wallet) => (
            <li key={wallet.id}>
              <button
                type="button"
                onClick={() => void wallet.connect()}
                className="flex items-center gap-2"
              >
                {wallet.metadata.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Wallet connected — show popover connector
  return (
    <ConnectedWallet
      activeAddress={activeAddress}
      activeNetwork={activeNetwork}
      activeUser={activeUser}
      onDisconnect={() => void handleDisconnect()}
    />
  )
}
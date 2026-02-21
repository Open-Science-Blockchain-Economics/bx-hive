import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { useActiveUser } from '../hooks/useActiveUser'
import { truncateAddress } from '../utils/address'

export default function HeaderStatus() {
  const navigate = useNavigate()
  const { activeAddress, wallets } = useWallet()
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
        <label tabIndex={0} className="btn btn-primary btn-sm">
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

  // Wallet connected but not yet registered in Registry
  if (!activeUser) {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="badge badge-warning badge-lg text-xs" title={activeAddress}>
          {truncateAddress(activeAddress)}
        </span>
        <button
          type="button"
          onClick={handleDisconnect}
          className="btn btn-outline btn-sm"
        >
          Disconnect
        </button>
      </div>
    )
  }

  // Wallet connected + registered
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="badge badge-success badge-lg" title={activeAddress}>
        {activeUser.name}
      </span>
      <button
        type="button"
        onClick={handleDisconnect}
        className="btn btn-outline btn-sm"
      >
        Disconnect
      </button>
    </div>
  )
}
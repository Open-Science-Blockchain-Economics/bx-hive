import { useCallback, useState } from 'react'
import { FaFlask, FaUser, FaRegCopy, FaCheck, FaSignOutAlt, FaCog } from 'react-icons/fa'
import NetworkSettingsModal from './NetworkSettingsModal'
import { truncateAddress } from '../utils/address'
import type { User } from '../types'

interface ConnectedWalletProps {
  activeAddress: string
  activeNetwork: string
  activeUser: User | null
  onDisconnect: () => void
}

export default function ConnectedWallet({ activeAddress, activeNetwork, activeUser, onDisconnect }: ConnectedWalletProps) {
  const [copied, setCopied] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(activeAddress).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [activeAddress])

  const closeDropdown = useCallback(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  }, [])

  const loraUrl = `https://lora.algokit.io/${activeNetwork}/account/${activeAddress}`

  const roleIcon =
    activeUser?.role === 'experimenter' ? (
      <FaFlask className="w-4 h-4" />
    ) : activeUser?.role === 'subject' ? (
      <FaUser className="w-4 h-4" />
    ) : null

  const triggerLabel = activeUser ? activeUser.name : truncateAddress(activeAddress)

  return (
    <div className="dropdown dropdown-end">
      <button tabIndex={0} type="button" className="btn btn-outline btn-sm w-40 gap-1.5 font-normal">
        {roleIcon}
        <span className="max-w-[120px] truncate">{triggerLabel}</span>
      </button>
      <div className="dropdown-content card bg-base-100 shadow-lg border border-base-300 w-64 p-3 z-50 mt-1">
        <div className="flex items-center gap-2">
          <a
            href={loraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs link link-hover truncate flex-1"
            title={activeAddress}
          >
            {truncateAddress(activeAddress)}
          </a>
          <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={handleCopy} title="Copy address">
            {copied ? <FaCheck className="w-3.5 h-3.5 text-success" /> : <FaRegCopy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="divider my-1" />
        <button
          type="button"
          className="btn btn-ghost btn-sm w-full justify-start gap-2"
          onClick={() => {
            closeDropdown()
            setSettingsOpen(true)
          }}
        >
          <FaCog className="w-4 h-4" />
          Settings
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm w-full justify-start text-error gap-2"
          onClick={() => {
            closeDropdown()
            onDisconnect()
          }}
        >
          <FaSignOutAlt className="w-4 h-4" />
          Disconnect
        </button>
      </div>
      <NetworkSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
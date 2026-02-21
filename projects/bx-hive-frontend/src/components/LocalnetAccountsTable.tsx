import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { type LocalnetAccount, type LocalnetAccountRole, useLocalnetAccounts } from '../hooks/useLocalnetAccounts'
import { truncateAddress } from '../utils/address'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-square ml-1 text-base opacity-40 hover:opacity-100"
      onClick={handleCopy}
      title="Copy address"
    >
      {copied ? '✓' : '⎘'}
    </button>
  )
}

function AccountRow({
  account,
  isSelected,
  activeAddress,
  onSelect,
  onRegister,
  onConnect,
}: {
  account: LocalnetAccount
  isSelected: boolean
  activeAddress: string | null
  onSelect: () => void
  onRegister: (address: string, name: string, role: LocalnetAccountRole) => Promise<void>
  onConnect: (address: string) => Promise<void>
}) {
  const [name, setName] = useState(account.name)
  const [role, setRole] = useState<LocalnetAccountRole>('subject')
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    setRegistering(true)
    setError(null)
    try {
      await onRegister(account.address, name.trim() || account.name, role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  const roleBadgeClass =
    account.role === 'experimenter'
      ? 'badge badge-primary badge-sm'
      : 'badge badge-secondary badge-sm'

  return (
    <>
      {/* Main row */}
      <tr
        className={`cursor-pointer hover transition-colors ${isSelected && !account.registered ? 'bg-base-200' : ''}`}
        onClick={!account.registered ? onSelect : undefined}
        title={!account.registered ? 'Click to register' : undefined}
      >
        <td className="text-base-content/50 text-sm w-10">{account.name.replace('Account ', '')}</td>
        <td>
          <span className="inline-flex items-center">
            <code className="text-xs" title={account.address}>
              {truncateAddress(account.address)}
            </code>
            <CopyButton text={account.address} />
          </span>
        </td>
        <td>
          {account.registered ? (
            <span className={roleBadgeClass}>{account.role}</span>
          ) : (
            <span className="text-base-content/40 text-xs">—</span>
          )}
        </td>
        <td className="text-right">
          {account.registered ? (
            activeAddress === account.address ? (
              <span className="text-success text-xs font-medium">● Active</span>
            ) : (
              <button
                type="button"
                className="btn btn-xs btn-outline btn-success"
                onClick={(e) => { e.stopPropagation(); void onConnect(account.address) }}
              >
                Connect
              </button>
            )
          ) : (
            <span className="text-base-content/40 text-xs">
              {isSelected ? '▲ close' : 'click to register'}
            </span>
          )}
        </td>
      </tr>

      {/* Expandable registration form — shown when row is selected and unregistered */}
      {isSelected && !account.registered && (
        <tr className="bg-base-200">
          <td colSpan={4} className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                className="input input-sm input-bordered w-40"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                disabled={registering}
                autoFocus
              />
              <select
                className="select select-sm select-bordered"
                value={role}
                onChange={(e) => setRole(e.target.value as LocalnetAccountRole)}
                disabled={registering}
              >
                <option value="subject">Subject</option>
                <option value="experimenter">Experimenter</option>
              </select>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void handleRegister()}
                disabled={registering}
              >
                {registering && <span className="loading loading-spinner loading-xs" />}
                Register
              </button>
            </div>
            {error && <p className="text-error text-xs mt-2">{error}</p>}
          </td>
        </tr>
      )}
    </>
  )
}

export default function LocalnetAccountsTable() {
  const { accounts, loading, seeded, registerAccount, refresh } = useLocalnetAccounts()
  const { wallets, activeAddress } = useWallet()
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)

  const handleConnect = async (address: string) => {
    const kmdWallet = wallets?.find((w) => w.id === 'kmd')
    if (!kmdWallet) return
    if (!kmdWallet.isConnected) {
      await kmdWallet.connect()
    }
    kmdWallet.setActiveAccount(address)
  }

  if (import.meta.env.VITE_ENVIRONMENT !== 'local') return null

  const registeredCount = accounts.filter((a) => a.registered).length

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300">
      <div className="card-body">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="card-title">Test Accounts</h2>
            {!loading && seeded && (
              <p className="text-xs text-base-content/50 mt-0.5">
                {registeredCount}/{accounts.length} registered — click an unregistered row to set up
              </p>
            )}
          </div>
          <button type="button" className="btn btn-xs btn-ghost" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>

        {!seeded && !loading && (
          <div className="alert alert-warning text-sm">
            <span>
              No seeded accounts found. Run{' '}
              <code className="font-mono bg-base-300 px-1 rounded">pnpm seed:localnet</code> then
              refresh.
            </span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner loading-md" />
          </div>
        )}

        {seeded && !loading && (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th>Role</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <AccountRow
                    key={account.address}
                    account={account}
                    isSelected={selectedAddress === account.address}
                    activeAddress={activeAddress ?? null}
                    onSelect={() =>
                      setSelectedAddress(
                        selectedAddress === account.address ? null : account.address,
                      )
                    }
                    onRegister={async (address, name, role) => {
                      await registerAccount(address, name, role)
                      setSelectedAddress(null)
                    }}
                    onConnect={handleConnect}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
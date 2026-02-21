import { useState } from 'react'
import { type LocalnetAccount, type LocalnetAccountRole, useLocalnetAccounts } from '../hooks/useLocalnetAccounts'
import { truncateAddress } from '../utils/address'

// ---------------------------------------------------------------------------
// Per-account row component
// ---------------------------------------------------------------------------
function AccountRow({
  account,
  onRegister,
}: {
  account: LocalnetAccount
  onRegister: (address: string, name: string, role: LocalnetAccountRole) => Promise<void>
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

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body py-4">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{account.name}</span>
              {account.registered ? (
                <span
                  className={`badge badge-sm ${
                    account.role === 'experimenter' ? 'badge-primary' : 'badge-secondary'
                  }`}
                >
                  {account.role}
                </span>
              ) : (
                <span className="badge badge-sm badge-ghost">Not registered</span>
              )}
            </div>
            <code className="text-xs text-base-content/50 mt-1 block" title={account.address}>
              {truncateAddress(account.address)}
            </code>
            {account.onChainName && account.onChainName !== account.name && (
              <span className="text-xs text-base-content/60 mt-0.5 block">
                On-chain name: {account.onChainName}
              </span>
            )}
          </div>

          {/* Registration form — only for unregistered accounts */}
          {!account.registered && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <input
                type="text"
                className="input input-sm input-bordered w-36"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                disabled={registering}
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
          )}
        </div>

        {error && <p className="text-error text-xs mt-2">{error}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DevTools() {
  const { accounts, loading, seeded, registerAccount, refresh } = useLocalnetAccounts()

  // Guard: only render on localnet
  if (import.meta.env.VITE_ENVIRONMENT !== 'local') {
    return (
      <div className="alert alert-error mt-6">
        <span>Dev Tools are only available in the local environment.</span>
      </div>
    )
  }

  if (!seeded && !loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Dev Tools</h1>
        <div className="alert alert-warning mt-6">
          <span>
            No seeded accounts found. Run{' '}
            <code className="font-mono bg-base-300 px-1 rounded">pnpm seed:localnet</code> from the{' '}
            <code className="font-mono bg-base-300 px-1 rounded">bx-hive-frontend</code> directory,
            then refresh this page.
          </span>
        </div>
      </div>
    )
  }

  const registeredCount = accounts.filter((a) => a.registered).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dev Tools</h1>
          <p className="text-base-content/70 mt-1 text-sm">
            LocalNet seeded accounts — register each with a role to use in experiments.
            {!loading && accounts.length > 0 && (
              <span className="ml-2 text-base-content/50">
                {registeredCount}/{accounts.length} registered
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountRow key={account.address} account={account} onRegister={registerAccount} />
          ))}
        </div>
      )}
    </div>
  )
}
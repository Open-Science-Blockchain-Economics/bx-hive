import { useState } from 'react'
import { truncateAddress } from '../../../utils/address'

interface SubjectEntry {
  address: string
  enrolled: number
  assigned: number
}

interface CreateMatchFormProps {
  appId: bigint
  unassigned: SubjectEntry[]
  onCreateMatch: (appId: bigint, investor: string, trustee: string) => Promise<void>
}

export default function CreateMatchForm({ appId, unassigned, onCreateMatch }: CreateMatchFormProps) {
  const [investor, setInvestor] = useState('')
  const [trustee, setTrustee] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!investor || !trustee || investor === trustee) return
    setCreating(true)
    setError('')
    try {
      await onCreateMatch(appId, investor, trustee)
      setInvestor('')
      setTrustee('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <h3 className="font-semibold mb-3">Create Match</h3>

      {unassigned.length < 2 ? (
        <p className="text-sm text-base-content/50">Need at least 2 unassigned subjects to create a match.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-0 sm:min-w-40">
              <label className="label label-text text-xs pb-1">Investor</label>
              <select className="select select-sm select-bordered w-full" value={investor} onChange={(e) => setInvestor(e.target.value)}>
                <option value="">Select investor…</option>
                {unassigned.map((s) => (
                  <option key={s.address} value={s.address}>
                    {truncateAddress(s.address)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0 sm:min-w-40">
              <label className="label label-text text-xs pb-1">Trustee</label>
              <select className="select select-sm select-bordered w-full" value={trustee} onChange={(e) => setTrustee(e.target.value)}>
                <option value="">Select trustee…</option>
                {unassigned.map((s) => (
                  <option key={s.address} value={s.address}>
                    {truncateAddress(s.address)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!investor || !trustee || investor === trustee || creating}
              onClick={() => void handleCreate()}
            >
              {creating ? <span className="loading loading-spinner loading-xs" /> : 'Create Match'}
            </button>
          </div>
          {investor && trustee && investor === trustee && (
            <p className="text-warning text-xs">Investor and trustee must be different subjects.</p>
          )}
          {error && <p className="text-error text-xs">{error}</p>}
        </div>
      )}
    </div>
  )
}
import { useState } from 'react'
import { FaPause, FaPlay } from 'react-icons/fa'
import { truncateAddress } from '../../../utils/address'

interface SubjectEntry {
  address: string
  enrolled: number
  assigned: number
}

interface CreateMatchFormProps {
  appId: bigint
  unassigned: SubjectEntry[]
  autoMatch: boolean
  onToggleAutoMatch: (val: boolean) => void
  onCreateMatch: (appId: bigint, investor: string, trustee: string) => Promise<void>
}

export default function CreateMatchForm({ appId, unassigned, autoMatch, onToggleAutoMatch, onCreateMatch }: CreateMatchFormProps) {
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Create Match</h3>
        <span className="tooltip tooltip-left" data-tip={autoMatch ? 'Pause auto-matching' : 'Auto-match unassigned subjects (FIFO)'}>
          <button type="button" className="btn btn-ghost btn-xs gap-1" onClick={() => onToggleAutoMatch(!autoMatch)}>
            {autoMatch ? (
              <>
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <FaPause className="w-3 h-3" /> Auto Match
              </>
            ) : (
              <>
                <FaPlay className="w-3 h-3" /> Auto Match
              </>
            )}
          </button>
        </span>
      </div>

      {unassigned.length < 2 ? (
        <p className="text-sm text-base-content/50">Need at least 2 unassigned subjects to create a match.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
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
            <div className="flex-1 min-w-40">
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

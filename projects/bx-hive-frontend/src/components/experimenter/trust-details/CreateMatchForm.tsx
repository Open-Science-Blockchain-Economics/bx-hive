import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Field } from '@/components/ds/field'
import { cn } from '@/lib/utils'
import { truncateAddress } from '../../../utils/address'

interface ParticipantEntry {
  address: string
  enrolled: number
  assigned: number
}

interface CreateMatchFormProps {
  appId: bigint
  unassigned: ParticipantEntry[]
  onCreateMatch: (appId: bigint, investor: string, trustee: string) => Promise<void>
}

const selectClass = cn(
  'h-9 w-full min-w-0 rounded-sm border border-input bg-card px-2.5 text-[13px] text-foreground font-ui transition-colors outline-none',
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
)

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
      <h3 className="t-h2 mb-3">Create Match</h3>
      {unassigned.length < 2 ? (
        <p className="text-sm text-muted-foreground">Need at least 2 unassigned participants to create a match.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Investor" htmlFor="cm-investor" className="flex-1 min-w-40">
              <select id="cm-investor" className={selectClass} value={investor} onChange={(e) => setInvestor(e.target.value)}>
                <option value="">Select investor…</option>
                {unassigned.map((s) => (
                  <option key={s.address} value={s.address}>
                    {truncateAddress(s.address)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trustee" htmlFor="cm-trustee" className="flex-1 min-w-40">
              <select id="cm-trustee" className={selectClass} value={trustee} onChange={(e) => setTrustee(e.target.value)}>
                <option value="">Select trustee…</option>
                {unassigned.map((s) => (
                  <option key={s.address} value={s.address}>
                    {truncateAddress(s.address)}
                  </option>
                ))}
              </select>
            </Field>
            <Btn
              variant="primary"
              size="sm"
              disabled={!investor || !trustee || investor === trustee || creating}
              onClick={() => void handleCreate()}
            >
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : 'Create match'}
            </Btn>
          </div>
          {investor && trustee && investor === trustee && (
            <p className="text-warn text-xs">Investor and trustee must be different participants.</p>
          )}
          {error && <p className="text-neg text-xs">{error}</p>}
        </div>
      )}
    </div>
  )
}

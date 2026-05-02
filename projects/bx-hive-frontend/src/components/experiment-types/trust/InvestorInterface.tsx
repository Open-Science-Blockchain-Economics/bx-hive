import { useState } from 'react'
import { Info, Loader2 } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { Rule } from '@/components/ds/separator'
import { cn } from '@/lib/utils'
import { useTrustVariation } from '../../../hooks/useTrustVariation'
import { calculateInvestorRefund, calculateTrusteeReceived } from '../../../experiment-logic/trustExperiment'
import { algoToMicroAlgo } from '../../../utils/amount'

interface InvestorInterfaceProps {
  appId: bigint
  matchId: number
  E1: number
  m: number
  UNIT: number
  onDecisionMade: () => void
}

interface StageProps {
  num: string
  label: string
  state: 'done' | 'active' | 'pending'
}

function Stage({ num, label, state }: StageProps) {
  return (
    <div className="flex flex-col items-start gap-1 px-3 py-2 border-l-2 border-border first:border-l-0 first:pl-0">
      <span className="font-mono text-[11px] text-muted-foreground">{num}</span>
      <span
        className={cn(
          'text-xs font-medium',
          state === 'active' ? 'text-foreground' : state === 'done' ? 'text-ink-2' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </div>
  )
}

export default function InvestorInterface({ appId, matchId, E1, m, UNIT, onDecisionMade }: InvestorInterfaceProps) {
  const { submitInvestorDecision } = useTrustVariation()
  const [investment, setInvestment] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refund = calculateInvestorRefund(E1, investment)
  const trusteeReceives = calculateTrusteeReceived(investment, m)

  async function handleSubmit() {
    setError(null)
    try {
      setSubmitting(true)
      await submitInvestorDecision(appId, matchId, algoToMicroAlgo(investment))
      onDecisionMade()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision')
    } finally {
      setSubmitting(false)
    }
  }

  const options: number[] = []
  for (let i = 0; i <= E1; i += UNIT) {
    options.push(Math.round(i * 1000) / 1000)
  }

  return (
    <Panel>
      <h2 className="t-h1 mb-4">Investor Decision</h2>

      <div role="alert" className="flex items-start gap-2.5 rounded-sm border border-info/35 bg-info-bg px-3 py-2.5 text-sm text-info mb-5">
        <Info className="size-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">You are the Investor</p>
          <p className="text-sm">Decide how much of your endowment to invest. Your investment will be multiplied by {m}.</p>
        </div>
      </div>

      <div className="flex border-y border-border my-5 overflow-x-auto">
        <Stage num="01" label="Send" state="active" />
        <Stage num="02" label={`Multiplier ×${m}`} state="pending" />
        <Stage num="03" label="Receive" state="pending" />
        <Stage num="04" label="Return" state="pending" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Panel padded={false} className="p-4 border-primary/35 bg-accent">
          <div className="t-micro mb-1">Your Endowment</div>
          <div className="font-mono text-3xl font-medium leading-none tracking-[-0.01em] text-primary">{E1.toLocaleString()} ALGO</div>
          <div className="text-xs text-muted-foreground mt-1.5">to invest</div>
        </Panel>
        <Panel padded={false} className="p-4">
          <div className="t-micro mb-1">Multiplier</div>
          <div className="font-mono text-3xl font-medium leading-none tracking-[-0.01em] text-foreground">x{m}</div>
          <div className="text-xs text-muted-foreground mt-1.5">Applied to investment</div>
        </Panel>
      </div>

      <Rule label="Make Your Decision" className="mb-4" />

      <div className="mb-5">
        <p className="text-sm font-medium mb-3">How much do you want to invest?</p>
        {options.length <= 10 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {options.map((amount) => (
              <Btn
                key={amount}
                variant={investment === amount ? 'primary' : 'secondary'}
                onClick={() => setInvestment(amount)}
                disabled={submitting}
              >
                {amount.toLocaleString()}
              </Btn>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min={0}
              max={E1}
              step={UNIT}
              value={investment}
              onChange={(e) => setInvestment(Number(e.target.value))}
              disabled={submitting}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>0</span>
              <span className="font-bold text-base text-primary">{investment.toLocaleString()}</span>
              <span>{E1.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted rounded-sm p-4 flex flex-col gap-2 mb-5">
        <h3 className="t-micro">Preview</h3>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span>You invest:</span>
            <span className="font-medium font-mono">{investment.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>You keep:</span>
            <span className="font-medium font-mono">{refund.toLocaleString()}</span>
          </div>
          <Rule className="my-1" />
          <div className="flex justify-between">
            <span>Trustee receives (x{m}):</span>
            <span className="font-medium font-mono text-primary">{trusteeReceives.toLocaleString()}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">The Trustee will then decide how much to return to you.</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-sm border border-neg/35 bg-neg-bg text-neg px-3 py-2.5 text-sm mb-5">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Btn variant="primary" size="lg" onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Submitting…
            </>
          ) : (
            'Submit Investment Decision'
          )}
        </Btn>
      </div>
    </Panel>
  )
}

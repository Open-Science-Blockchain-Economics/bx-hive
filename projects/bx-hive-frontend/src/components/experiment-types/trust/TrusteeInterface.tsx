import { useState } from 'react'
import { Check, Info, Loader2 } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { Rule } from '@/components/ds/separator'
import { cn } from '@/lib/utils'
import { useTrustVariation } from '../../../hooks/useTrustVariation'
import { calculateTrusteeReceived } from '../../../experiment-logic/trustExperiment'
import { algoToMicroAlgo } from '../../../utils/amount'

interface TrusteeInterfaceProps {
  appId: bigint
  matchId: number
  E1: number
  E2: number
  m: number
  UNIT: number
  investorDecision: number
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
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">{num}</span>
        {state === 'done' && <Check className="size-3 text-pos" />}
      </div>
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

export default function TrusteeInterface({ appId, matchId, E1, E2, m, UNIT, investorDecision, onDecisionMade }: TrusteeInterfaceProps) {
  const { submitTrusteeDecision } = useTrustVariation()
  const received = calculateTrusteeReceived(investorDecision, m)

  const [returnAmount, setReturnAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trusteeKeeps = received - returnAmount

  async function handleSubmit() {
    setError(null)
    try {
      setSubmitting(true)
      await submitTrusteeDecision(appId, matchId, algoToMicroAlgo(returnAmount))
      onDecisionMade()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision')
    } finally {
      setSubmitting(false)
    }
  }

  const options: number[] = []
  for (let i = 0; i <= received; i += UNIT) {
    options.push(Math.round(i * 1000) / 1000)
  }

  return (
    <Panel>
      <h2 className="t-h1 mb-4">Trustee Decision</h2>

      <div role="alert" className="flex items-start gap-2.5 rounded-sm border border-info/35 bg-info-bg px-3 py-2.5 text-sm text-info mb-5">
        <Info className="size-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">You are the Trustee</p>
          <p className="text-sm">
            The Investor sent you {investorDecision.toLocaleString()}. After multiplication (x{m}), you received {received.toLocaleString()}
            .
          </p>
        </div>
      </div>

      <div className="flex border-y border-border my-5 overflow-x-auto">
        <Stage num="01" label="Investor sends" state="done" />
        <Stage num="02" label={`Multiplier ×${m}`} state="done" />
        <Stage num="03" label="Receive" state="done" />
        <Stage num="04" label="Return" state="active" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Panel padded={false} className="p-4">
          <div className="t-micro mb-1">Your Endowment</div>
          <div className="font-mono text-3xl font-medium leading-none tracking-[-0.01em] text-foreground">{E2.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1.5">initial tokens</div>
        </Panel>
        <Panel padded={false} className="p-4 border-primary/35 bg-accent">
          <div className="t-micro mb-1">You Received</div>
          <div className="font-mono text-3xl font-medium leading-none tracking-[-0.01em] text-primary">{received.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1.5">From investor (x{m})</div>
        </Panel>
      </div>

      <div className="bg-muted rounded-sm p-4 mb-5">
        <h3 className="t-micro mb-2">What Happened</h3>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span>Investor sent:</span>
            <span className="font-medium font-mono">{investorDecision.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Multiplied by {m}:</span>
            <span className="font-medium font-mono">{received.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <Rule label="Make Your Decision" className="mb-4" />

      <div className="mb-5">
        <p className="text-sm font-medium mb-3">How much do you want to return to the Investor?</p>
        {options.length <= 10 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {options.map((amount) => (
              <Btn
                key={amount}
                variant={returnAmount === amount ? 'primary' : 'secondary'}
                onClick={() => setReturnAmount(amount)}
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
              max={received}
              step={UNIT}
              value={returnAmount}
              onChange={(e) => setReturnAmount(Number(e.target.value))}
              disabled={submitting}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>0</span>
              <span className="font-bold text-base text-primary">{returnAmount.toLocaleString()}</span>
              <span>{received.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted rounded-sm p-4 flex flex-col gap-2 mb-5">
        <h3 className="t-micro">Preview</h3>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span>You return to Investor:</span>
            <span className="font-medium font-mono">{returnAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>You keep from received:</span>
            <span className="font-medium font-mono">{trusteeKeeps.toLocaleString()}</span>
          </div>
          <Rule className="my-1" />
          <div className="flex justify-between font-semibold">
            <span>Your total payout:</span>
            <span className="font-mono text-pos">{(E2 + trusteeKeeps).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Investor's total payout:</span>
            <span className="font-mono">{(E1 - investorDecision + returnAmount).toLocaleString()}</span>
          </div>
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
            'Submit Return Decision'
          )}
        </Btn>
      </div>
    </Panel>
  )
}

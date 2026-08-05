import { CheckCircle2 } from 'lucide-react'

import { Panel } from '@/components/ds/card'
import { Rule } from '@/components/ds/separator'
import type { RoleLabels } from '@/hooks/useTrustExperiments'

interface ResultsDisplayProps {
  E1: number
  E2: number
  m: number
  investorDecision: number
  trusteeDecision: number
  investorPayout: number
  trusteePayout: number
  isInvestor: boolean
  /** Names the experimenter gave the two roles; already defaulted by the caller. */
  roleLabels: RoleLabels
}

export default function ResultsDisplay({
  E1,
  E2,
  m,
  investorDecision,
  trusteeDecision,
  investorPayout,
  trusteePayout,
  isInvestor,
  roleLabels,
}: ResultsDisplayProps) {
  const received = investorDecision * m
  const yourPayout = isInvestor ? investorPayout : trusteePayout
  const partnerPayout = isInvestor ? trusteePayout : investorPayout
  const yourLabel = isInvestor ? roleLabels.investorLabel : roleLabels.trusteeLabel
  const partnerLabel = isInvestor ? roleLabels.trusteeLabel : roleLabels.investorLabel

  return (
    <Panel>
      <h2 className="t-h1 mb-4">Experiment Complete</h2>

      <div role="alert" className="flex items-start gap-2.5 rounded-sm border border-pos/35 bg-pos-bg px-3 py-2.5 text-sm text-pos mb-5">
        <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Your role: {yourLabel}</p>
          <p className="text-sm">The experiment has ended. See results below.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Panel padded={false} className="p-4 border-pos/35 bg-pos-bg">
          <div className="t-micro mb-1">Your Payout</div>
          <div className="font-mono text-3xl font-medium leading-none tracking-[-0.01em] text-pos">{yourPayout.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1.5">{yourLabel}</div>
        </Panel>
        <Panel padded={false} className="p-4">
          <div className="t-micro mb-1">Partner's Payout</div>
          <div className="font-mono text-3xl font-medium leading-none tracking-[-0.01em] text-foreground">
            {partnerPayout.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">{partnerLabel}</div>
        </Panel>
      </div>

      <div className="bg-muted rounded-sm p-4">
        <h3 className="t-micro mb-3">Experiment Summary</h3>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span>{roleLabels.investorLabel} endowment (E1):</span>
            <span className="font-medium font-mono">{E1.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>{roleLabels.trusteeLabel} endowment (E2):</span>
            <span className="font-medium font-mono">{E2.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Multiplier:</span>
            <span className="font-medium font-mono">x{m}</span>
          </div>
          <Rule className="my-2" />
          <div className="flex justify-between">
            <span>{roleLabels.investorLabel} sent:</span>
            <span className="font-medium font-mono">{investorDecision.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>
              {roleLabels.trusteeLabel} received (x{m}):
            </span>
            <span className="font-medium font-mono">{received.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>{roleLabels.trusteeLabel} returned:</span>
            <span className="font-medium font-mono">{trusteeDecision.toLocaleString()}</span>
          </div>
          <Rule className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>{roleLabels.investorLabel} final payout:</span>
            <span className={`font-mono ${isInvestor ? 'text-pos' : ''}`}>{investorPayout.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{roleLabels.trusteeLabel} final payout:</span>
            <span className={`font-mono ${!isInvestor ? 'text-pos' : ''}`}>{trusteePayout.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}

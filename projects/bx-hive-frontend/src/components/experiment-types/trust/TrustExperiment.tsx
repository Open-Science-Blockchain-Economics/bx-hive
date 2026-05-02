import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import type { Match, VariationConfig } from '../../../hooks/useTrustVariation'
import { PHASE_COMPLETED, PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION } from '../../../hooks/useTrustVariation'
import { microAlgoToAlgo } from '../../../utils/amount'
import InvestorInterface from './InvestorInterface'
import ResultsDisplay from './ResultsDisplay'
import TrusteeInterface from './TrusteeInterface'

interface TrustExperimentProps {
  appId: bigint
  match: Match
  config: VariationConfig
  activeAddress: string
  onRefresh: () => void
}

interface WaitingStateProps {
  title: string
  children: React.ReactNode
  onRefresh: () => void
}

function WaitingState({ title, children, onRefresh }: WaitingStateProps) {
  return (
    <Panel className="text-center">
      <h2 className="t-h1 mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground mb-2 flex flex-col gap-2">{children}</div>
      <p className="text-xs text-faint mt-4">Page auto-refreshes every 3 seconds.</p>
      <div className="mt-4 flex justify-center">
        <Btn variant="secondary" size="sm" onClick={onRefresh}>
          Refresh now
        </Btn>
      </div>
    </Panel>
  )
}

export default function TrustExperiment({ appId, match, config, activeAddress, onRefresh }: TrustExperimentProps) {
  const E1 = microAlgoToAlgo(config.e1)
  const E2 = microAlgoToAlgo(config.e2)
  const m = Number(config.multiplier)
  const UNIT = microAlgoToAlgo(config.unit)

  const isInvestor = match.investor === activeAddress
  const phase = match.phase

  if (phase === PHASE_COMPLETED) {
    return (
      <ResultsDisplay
        E1={E1}
        E2={E2}
        m={m}
        investorDecision={microAlgoToAlgo(match.investment)}
        trusteeDecision={microAlgoToAlgo(match.returnAmount)}
        investorPayout={microAlgoToAlgo(match.investorPayout)}
        trusteePayout={microAlgoToAlgo(match.trusteePayout)}
        isInvestor={isInvestor}
      />
    )
  }

  if (phase === PHASE_INVESTOR_DECISION) {
    if (isInvestor) {
      return <InvestorInterface appId={appId} matchId={match.matchId} E1={E1} m={m} UNIT={UNIT} onDecisionMade={onRefresh} />
    }
    return (
      <WaitingState title="Waiting for Investor" onRefresh={onRefresh}>
        <p>The Investor is deciding how much to send you.</p>
      </WaitingState>
    )
  }

  if (phase === PHASE_TRUSTEE_DECISION) {
    if (!isInvestor) {
      return (
        <TrusteeInterface
          appId={appId}
          matchId={match.matchId}
          E1={E1}
          E2={E2}
          m={m}
          UNIT={UNIT}
          investorDecision={microAlgoToAlgo(match.investment)}
          onDecisionMade={onRefresh}
        />
      )
    }
    const invested = microAlgoToAlgo(match.investment)
    return (
      <WaitingState title="Waiting for Trustee" onRefresh={onRefresh}>
        <p>
          You invested <span className="font-mono font-semibold text-foreground">{invested.toLocaleString()} ALGO</span>.
        </p>
        <p>
          The Trustee received <span className="font-mono font-semibold text-foreground">{(invested * m).toLocaleString()} ALGO</span> and
          is deciding how much to return.
        </p>
      </WaitingState>
    )
  }

  return (
    <Panel className="text-center py-8 text-muted-foreground text-sm">
      <p>Unknown experiment state</p>
    </Panel>
  )
}

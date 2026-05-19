import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { useAssetMetadata } from '../../../hooks/useAssetMetadata'
import type { Match, VariationConfig } from '../../../hooks/useTrustVariation'
import { PHASE_COMPLETED, PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION } from '../../../hooks/useTrustVariation'
import { baseUnitsToWhole } from '../../../utils/amount'
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
      <p className="text-xs text-muted-foreground mt-4">Page auto-refreshes every 3 seconds.</p>
      <div className="mt-4 flex justify-center">
        <Btn variant="secondary" size="sm" onClick={onRefresh}>
          Refresh now
        </Btn>
      </div>
    </Panel>
  )
}

export default function TrustExperiment({ appId, match, config, activeAddress, onRefresh }: TrustExperimentProps) {
  const { decimals } = useAssetMetadata(config.assetId)
  const E1 = baseUnitsToWhole(config.e1, decimals)
  const E2 = baseUnitsToWhole(config.e2, decimals)
  const m = Number(config.multiplier)
  const UNIT = baseUnitsToWhole(config.unit, decimals)

  const isInvestor = match.investor === activeAddress
  const phase = match.phase

  if (phase === PHASE_COMPLETED) {
    return (
      <ResultsDisplay
        E1={E1}
        E2={E2}
        m={m}
        investorDecision={baseUnitsToWhole(match.investment, decimals)}
        trusteeDecision={baseUnitsToWhole(match.returnAmount, decimals)}
        investorPayout={baseUnitsToWhole(match.investorPayout, decimals)}
        trusteePayout={baseUnitsToWhole(match.trusteePayout, decimals)}
        isInvestor={isInvestor}
      />
    )
  }

  if (phase === PHASE_INVESTOR_DECISION) {
    if (isInvestor) {
      return (
        <InvestorInterface appId={appId} matchId={match.matchId} E1={E1} m={m} UNIT={UNIT} decimals={decimals} onDecisionMade={onRefresh} />
      )
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
          decimals={decimals}
          investorDecision={baseUnitsToWhole(match.investment, decimals)}
          onDecisionMade={onRefresh}
        />
      )
    }
    const invested = baseUnitsToWhole(match.investment, decimals)
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

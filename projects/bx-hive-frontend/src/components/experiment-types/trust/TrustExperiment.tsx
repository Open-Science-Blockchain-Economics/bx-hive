import { useEffect, useState } from 'react'
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
  dataUpdatedAt: number
  refreshIntervalMs: number
  onRefresh: () => void
}

interface WaitingStateProps {
  title: string
  children: React.ReactNode
  dataUpdatedAt: number
  refreshIntervalMs: number
}

const REFRESHING_GRACE_MS = 1000

function refreshLabel(dataUpdatedAt: number, refreshIntervalMs: number, now: number) {
  const msUntilNext = dataUpdatedAt + refreshIntervalMs - now
  if (msUntilNext > 0) return `Refreshing in ${Math.ceil(msUntilNext / 1000)}s`
  if (msUntilNext > -REFRESHING_GRACE_MS) return 'Refreshing in 1s'
  return 'Refreshing…'
}

function WaitingState({ title, children, dataUpdatedAt, refreshIntervalMs }: WaitingStateProps) {
  // Store the computed label rather than `now`: React.setState bails on identical strings,
  // so the 250ms tick only triggers a re-render when the displayed text actually changes.
  const [label, setLabel] = useState(() => refreshLabel(dataUpdatedAt, refreshIntervalMs, Date.now()))

  useEffect(() => {
    const tick = () => setLabel(refreshLabel(dataUpdatedAt, refreshIntervalMs, Date.now()))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [dataUpdatedAt, refreshIntervalMs])

  return (
    <Panel className="text-center">
      <h2 className="t-h1 mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground mb-2 flex flex-col gap-2">{children}</div>
      <p className="text-sm text-muted-foreground mt-3">You can leave this page and come back later — your match will be waiting.</p>
      <p className="text-xs text-muted-foreground mt-4 tabular-nums">{label}</p>
    </Panel>
  )
}

export default function TrustExperiment({
  appId,
  match,
  config,
  activeAddress,
  dataUpdatedAt,
  refreshIntervalMs,
  onRefresh,
}: TrustExperimentProps) {
  const { decimals, unitName } = useAssetMetadata(config.assetId)
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
        <InvestorInterface
          appId={appId}
          matchId={match.matchId}
          E1={E1}
          m={m}
          UNIT={UNIT}
          decimals={decimals}
          unitName={unitName}
          onDecisionMade={onRefresh}
        />
      )
    }
    return (
      <WaitingState title="Waiting for Investor" dataUpdatedAt={dataUpdatedAt} refreshIntervalMs={refreshIntervalMs}>
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
      <WaitingState title="Waiting for Trustee" dataUpdatedAt={dataUpdatedAt} refreshIntervalMs={refreshIntervalMs}>
        <p>
          You invested{' '}
          <span className="font-mono font-semibold text-foreground">
            {invested.toLocaleString()} {unitName}
          </span>
          .
        </p>
        <p>
          The Trustee received{' '}
          <span className="font-mono font-semibold text-foreground">
            {(invested * m).toLocaleString()} {unitName}
          </span>{' '}
          and is deciding how much to return.
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

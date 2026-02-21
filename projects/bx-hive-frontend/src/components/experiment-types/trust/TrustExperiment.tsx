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
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body text-center">
          <h2 className="card-title justify-center">Waiting for Investor</h2>
          <p className="text-base-content/70 mt-2">The Investor is deciding how much to send you.</p>
          <p className="text-sm text-base-content/50 mt-4">Page auto-refreshes every 3 seconds.</p>
          <button className="btn btn-outline mt-4" onClick={onRefresh}>
            Refresh Now
          </button>
        </div>
      </div>
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
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body text-center">
          <h2 className="card-title justify-center">Waiting for Trustee</h2>
          <p className="text-base-content/70 mt-2">
            You invested <span className="font-bold">{microAlgoToAlgo(match.investment).toLocaleString()} ALGO</span>.
          </p>
          <p className="text-base-content/70">
            The Trustee received{' '}
            <span className="font-bold">{(microAlgoToAlgo(match.investment) * m).toLocaleString()} ALGO</span> and is deciding how much to return.
          </p>
          <p className="text-sm text-base-content/50 mt-4">Page auto-refreshes every 3 seconds.</p>
          <button className="btn btn-outline mt-4" onClick={onRefresh}>
            Refresh Now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-8 text-base-content/60">
      <p>Unknown experiment state</p>
    </div>
  )
}
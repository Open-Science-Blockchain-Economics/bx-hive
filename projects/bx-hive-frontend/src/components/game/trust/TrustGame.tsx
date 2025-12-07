import type { Game, Match, TrustGameState } from '../../../types'
import InvestorInterface from './InvestorInterface'
import ResultsDisplay from './ResultsDisplay'
import TrusteeInterface from './TrusteeInterface'

interface TrustGameProps {
  game: Game
  match: Match
  activeUserId: string
  onGameUpdate: () => void
}

export default function TrustGame({ game, match, activeUserId, onGameUpdate }: TrustGameProps) {
  // Extract Trust Game parameters
  const E1 = game.parameters.E1 as number
  const E2 = game.parameters.E2 as number
  const m = game.parameters.m as number
  const UNIT = game.parameters.UNIT as number

  // Determine player role
  const isInvestor = match.player1Id === activeUserId

  // Check if state is initialized
  if (!match.state) {
    return (
      <div className="text-center py-8 text-base-content/60">
        <p>Game state not initialized</p>
      </div>
    )
  }

  const state = match.state as TrustGameState
  const { phase, investorDecision, trusteeDecision, investorPayout, trusteePayout } = state

  // Completed - show results
  if (
    phase === 'completed' &&
    investorDecision !== undefined &&
    trusteeDecision !== undefined &&
    investorPayout !== undefined &&
    trusteePayout !== undefined
  ) {
    return (
      <ResultsDisplay
        E1={E1}
        E2={E2}
        m={m}
        investorDecision={investorDecision}
        trusteeDecision={trusteeDecision}
        investorPayout={investorPayout}
        trusteePayout={trusteePayout}
        isInvestor={isInvestor}
      />
    )
  }

  // Investor decision phase
  if (phase === 'investor_decision') {
    if (isInvestor) {
      return <InvestorInterface gameId={game.id} matchId={match.id} E1={E1} m={m} UNIT={UNIT} onDecisionMade={onGameUpdate} />
    } else {
      return (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">Waiting for Investor</h2>
            <p className="text-base-content/70 mt-2">The Investor is deciding how much to send you.</p>
            <p className="text-sm text-base-content/50 mt-4">Refresh the page to check for updates.</p>
            <button className="btn btn-outline mt-4" onClick={onGameUpdate}>
              Refresh
            </button>
          </div>
        </div>
      )
    }
  }

  // Trustee decision phase
  if (phase === 'trustee_decision' && investorDecision !== undefined) {
    if (!isInvestor) {
      return (
        <TrusteeInterface
          gameId={game.id}
          matchId={match.id}
          E1={E1}
          E2={E2}
          m={m}
          UNIT={UNIT}
          investorDecision={investorDecision}
          onDecisionMade={onGameUpdate}
        />
      )
    } else {
      return (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">Waiting for Trustee</h2>
            <p className="text-base-content/70 mt-2">
              You invested <span className="font-bold">{investorDecision.toLocaleString()}</span>.
            </p>
            <p className="text-base-content/70">
              The Trustee received <span className="font-bold">{(investorDecision * m).toLocaleString()}</span> and is deciding how much to
              return.
            </p>
            <p className="text-sm text-base-content/50 mt-4">Refresh the page to check for updates.</p>
            <button className="btn btn-outline mt-4" onClick={onGameUpdate}>
              Refresh
            </button>
          </div>
        </div>
      )
    }
  }

  // Unknown state
  return (
    <div className="text-center py-8 text-base-content/60">
      <p>Unknown game state</p>
    </div>
  )
}

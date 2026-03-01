import { Link } from 'react-router-dom'
import { PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION } from '../../hooks/useTrustVariation'
import type { Match } from '../../hooks/useTrustVariation'

interface ActiveMatchCardProps {
  appId: bigint
  match: Match
  activeAddress: string
}

export default function ActiveMatchCard({ appId, match, activeAddress }: ActiveMatchCardProps) {
  const isInvestor = match.investor === activeAddress
  const isMyTurn = (isInvestor && match.phase === PHASE_INVESTOR_DECISION) || (!isInvestor && match.phase === PHASE_TRUSTEE_DECISION)

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title">Trust Game</h3>
            <p className="text-xs text-base-content/50 mt-1">
              Role: <span className="font-medium">{isInvestor ? 'Investor' : 'Trustee'}</span>
            </p>
          </div>
          <span className={`badge ${isMyTurn ? 'badge-warning' : 'badge-ghost'}`}>{isMyTurn ? 'Your Turn' : 'Waiting'}</span>
        </div>
        <div className="card-actions justify-end mt-2">
          {isMyTurn ? (
            <Link to={`/play/${String(appId)}`} className="btn btn-success btn-sm">
              Play
            </Link>
          ) : (
            <Link to={`/play/${String(appId)}`} className="btn btn-ghost btn-sm">
              View Status
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import type { Match } from '../../hooks/useTrustVariation'
import { microAlgoToAlgo } from '../../utils/amount'

interface CompletedMatchCardProps {
  appId: bigint
  match: Match
  activeAddress: string
}

export default function CompletedMatchCard({ appId, match, activeAddress }: CompletedMatchCardProps) {
  const payout = match.investor === activeAddress ? match.investorPayout : match.trusteePayout

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title">Trust Game</h3>
            <p className="text-xs text-base-content/50 mt-1">
              Payout: <span className="font-medium text-success">{microAlgoToAlgo(payout).toLocaleString()} ALGO</span>
            </p>
          </div>
          <span className="badge badge-success">Completed</span>
        </div>
        <div className="card-actions justify-end mt-2">
          <Link to={`/play/${String(appId)}`} className="btn btn-ghost btn-sm">
            View Results
          </Link>
        </div>
      </div>
    </div>
  )
}

import { PHASE_COMPLETED } from '../../../hooks/useTrustVariation'
import type { Match } from '../../../hooks/useTrustVariation'
import { truncateAddress } from '../../../utils/address'
import { microAlgoToAlgo } from '../../../utils/amount'

interface MatchesTableProps {
  matches: Match[]
}

export default function MatchesTable({ matches }: MatchesTableProps) {
  return (
    <div>
      <h3 className="font-semibold mb-3">Matches ({matches.length})</h3>
      {matches.length === 0 ? (
        <p className="text-sm text-base-content/50">No matches created yet.</p>
      ) : (
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Investor</th>
              <th>Trustee</th>
              <th>Phase</th>
              <th>Investor Payout</th>
              <th>Trustee Payout</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.matchId}>
                <td>{m.matchId}</td>
                <td className="font-mono text-xs">{truncateAddress(m.investor)}</td>
                <td className="font-mono text-xs">{truncateAddress(m.trustee)}</td>
                <td>
                  {m.phase === PHASE_COMPLETED ? (
                    <span className="badge badge-sm badge-success">Completed</span>
                  ) : m.phase === 1 ? (
                    <span className="badge badge-sm badge-info">Trustee deciding</span>
                  ) : (
                    <span className="badge badge-sm badge-info">Investor deciding</span>
                  )}
                </td>
                <td>{m.phase === PHASE_COMPLETED ? `${microAlgoToAlgo(m.investorPayout).toFixed(3)} ALGO` : '\u2014'}</td>
                <td>{m.phase === PHASE_COMPLETED ? `${microAlgoToAlgo(m.trusteePayout).toFixed(3)} ALGO` : '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

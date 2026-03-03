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
                <td className="font-mono text-xs">
                  <a
                    href={`https://lora.algokit.io/localnet/account/${m.investor}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-hover inline-flex items-center gap-1"
                  >
                    {truncateAddress(m.investor)}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm7.25-.75a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 1 1-1.06-1.06l5.22-5.22H12.25a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                  </a>
                </td>
                <td className="font-mono text-xs">
                  <a
                    href={`https://lora.algokit.io/localnet/account/${m.trustee}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-hover inline-flex items-center gap-1"
                  >
                    {truncateAddress(m.trustee)}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm7.25-.75a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 1 1-1.06-1.06l5.22-5.22H12.25a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                  </a>
                </td>
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

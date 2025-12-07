import type { Game, TrustGameState, User } from '../../../types'

interface TrustGameResultsProps {
  game: Game
  users: User[]
}

export default function TrustGameResults({ game, users }: TrustGameResultsProps) {
  function getUserName(userId: string): string {
    return users.find((u) => u.id === userId)?.name || 'Unknown'
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="divider my-0"></div>
      <h4 className="font-semibold">Match Details</h4>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Investor</th>
              <th>Trustee</th>
              <th>Status</th>
              <th>Invested</th>
              <th>Returned</th>
              <th>Inv. Payout</th>
              <th>Tru. Payout</th>
            </tr>
          </thead>
          <tbody>
            {game.matches.map((match) => {
              const state = match.state as TrustGameState | undefined

              return (
                <tr key={match.id}>
                  <td>{getUserName(match.player1Id)}</td>
                  <td>{match.player2Id ? getUserName(match.player2Id) : '-'}</td>
                  <td>
                    <span
                      className={`badge badge-sm ${
                        match.status === 'completed' ? 'badge-success' : match.status === 'playing' ? 'badge-warning' : 'badge-neutral'
                      }`}
                    >
                      {state?.phase === 'investor_decision'
                        ? 'Waiting: Investor'
                        : state?.phase === 'trustee_decision'
                          ? 'Waiting: Trustee'
                          : match.status}
                    </span>
                  </td>
                  <td>{state?.investorDecision ?? '-'}</td>
                  <td>{state?.trusteeDecision ?? '-'}</td>
                  <td className={state?.investorPayout !== undefined ? 'text-success font-medium' : ''}>{state?.investorPayout ?? '-'}</td>
                  <td className={state?.trusteePayout !== undefined ? 'text-success font-medium' : ''}>{state?.trusteePayout ?? '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

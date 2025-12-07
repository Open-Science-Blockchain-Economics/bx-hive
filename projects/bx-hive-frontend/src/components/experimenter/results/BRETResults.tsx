import { useState } from 'react'
import type { BRETState, Game, User } from '../../../types'
import BRETBox from '../../game/bret/BRETBox'

interface BRETResultsProps {
  game: Game
  users: User[]
}

export default function BRETResults({ game, users }: BRETResultsProps) {
  const [viewingMatchId, setViewingMatchId] = useState<string | null>(null)

  const rows = game.parameters.rows as number
  const cols = game.parameters.cols as number
  const paymentPerBox = game.parameters.paymentPerBox as number
  const totalBoxes = rows * cols

  function getUserName(userId: string): string {
    return users.find((u) => u.id === userId)?.name || 'Unknown'
  }

  const viewingMatch = viewingMatchId ? game.matches.find((m) => m.id === viewingMatchId) : null
  const viewingState = viewingMatch?.state as BRETState | undefined

  return (
    <>
      <div className="mt-4 space-y-3">
        <div className="divider my-0"></div>
        <h4 className="font-semibold">Player Results</h4>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Player</th>
                <th>Status</th>
                <th>Boxes Selected</th>
                <th>Risk Taken</th>
                <th>Result</th>
                <th>Payout</th>
                <th>Pattern</th>
              </tr>
            </thead>
            <tbody>
              {game.matches.map((match) => {
                const state = match.state as BRETState | undefined
                const boxesSelected = state?.boxesCollected ?? '-'
                const riskPercentage = state?.boxesCollected ? `${((state.boxesCollected / totalBoxes) * 100).toFixed(1)}%` : '-'
                const result = state?.hitBomb === true ? '💥 Hit' : state?.hitBomb === false ? '✓ Safe' : '-'

                return (
                  <tr key={match.id}>
                    <td>{getUserName(match.player1Id)}</td>
                    <td>
                      <span
                        className={`badge badge-sm ${
                          match.status === 'completed' ? 'badge-success' : match.status === 'playing' ? 'badge-warning' : 'badge-neutral'
                        }`}
                      >
                        {match.status}
                      </span>
                    </td>
                    <td>{boxesSelected}</td>
                    <td>{riskPercentage}</td>
                    <td>
                      {state?.hitBomb === true && <span className="text-error font-medium">{result}</span>}
                      {state?.hitBomb === false && <span className="text-success font-medium">{result}</span>}
                      {state?.hitBomb === undefined && result}
                    </td>
                    <td className={state?.payout !== undefined ? 'font-medium' : ''}>${state?.payout ?? '-'}</td>
                    <td>
                      {state?.selectedBoxes && state.bombLocation !== undefined ? (
                        <button className="btn btn-ghost btn-xs" onClick={() => setViewingMatchId(match.id)}>
                          View
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pattern Viewer Modal */}
      {viewingMatch && viewingState && viewingState.selectedBoxes && viewingState.bombLocation !== undefined && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">{getUserName(viewingMatch.player1Id)}'s Selection Pattern</h3>

            <div className="space-y-4">
              {/* Stats */}
              <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                <div className="stat">
                  <div className="stat-title">Boxes Selected</div>
                  <div className="stat-value text-sm">{viewingState.boxesCollected}</div>
                  <div className="stat-desc">{((viewingState.boxesCollected! / totalBoxes) * 100).toFixed(1)}% risk</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Result</div>
                  <div className={`stat-value text-sm ${viewingState.hitBomb ? 'text-error' : 'text-success'}`}>
                    {viewingState.hitBomb ? '💥 Hit Bomb' : '✓ Safe'}
                  </div>
                  <div className="stat-desc">Payout: ${viewingState.payout}</div>
                </div>
              </div>

              {/* Grid */}
              <div>
                <p className="text-sm text-base-content/70 mb-3">
                  {viewingState.hitBomb
                    ? `Bomb was at position ${viewingState.bombLocation + 1} - player selected that box!`
                    : `Bomb was at position ${viewingState.bombLocation + 1} - player avoided it!`}
                </p>

                <div
                  className="grid gap-1 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    maxWidth: `${cols * 40}px`,
                  }}
                >
                  {Array.from({ length: totalBoxes }).map((_, index) => (
                    <BRETBox
                      key={index}
                      index={index}
                      isSelected={viewingState.selectedBoxes!.includes(index)}
                      isClickable={false}
                      isBomb={index === viewingState.bombLocation}
                      showResult={true}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setViewingMatchId(null)}>
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setViewingMatchId(null)}></div>
        </div>
      )}
    </>
  )
}

import { getVariationLabel } from '../../../db'
import type { Experiment, ParameterVariation, User } from '../../../types'

interface VariationDetailProps {
  experiment: Experiment
  variationIndex: number
  variations: ParameterVariation[]
  users: User[]
  showPlayers: boolean
  actionInProgress: boolean
  onClose: (experimentId: string) => void
  onReopen: (experimentId: string) => void
}

export default function VariationDetail({
  experiment,
  variationIndex,
  variations,
  users,
  showPlayers,
  actionInProgress,
  onClose,
  onReopen,
}: VariationDetailProps) {
  const variationLabel = getVariationLabel(experiment.parameters, variations)
  const playing = experiment.matches.filter((m) => m.status === 'playing').length
  const completed = experiment.matches.filter((m) => m.status === 'completed').length

  return (
    <div className="border border-base-300 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-semibold">
            Variation {variationIndex + 1}: {variationLabel}
          </div>
          <div className="text-sm text-base-content/70">
            {experiment.players.length} players &bull; {playing} playing &bull; {completed} completed
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              experiment.status === 'active' ? 'badge-success' : experiment.status === 'closed' ? 'badge-warning' : 'badge-neutral'
            }`}
          >
            {experiment.status}
          </span>
          {experiment.status === 'active' ? (
            <button className="btn btn-warning btn-sm" onClick={() => onClose(experiment.id)} disabled={actionInProgress}>
              Close
            </button>
          ) : (
            <button className="btn btn-success btn-sm" onClick={() => onReopen(experiment.id)} disabled={actionInProgress}>
              Reopen
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        {variations.map((v) => (
          <div key={v.parameterName}>
            <span className="text-base-content/70">{v.parameterName}: </span>
            <span className="font-medium">{experiment.parameters[v.parameterName]}</span>
          </div>
        ))}
      </div>

      {experiment.players.length > 0 && showPlayers && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Registered Players</div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Registered At</th>
                </tr>
              </thead>
              <tbody>
                {experiment.players.map((player) => {
                  const user = users.find((u) => u.id === player.userId)
                  return (
                    <tr key={player.userId}>
                      <td>{user?.name || 'Unknown'}</td>
                      <td>{new Date(player.registeredAt).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

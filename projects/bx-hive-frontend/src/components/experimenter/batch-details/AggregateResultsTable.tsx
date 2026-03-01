import { getVariationLabel } from '../../../db'
import type { Experiment, ExperimentBatch } from '../../../types'

interface AggregateResultsTableProps {
  experiments: Experiment[]
  batch: ExperimentBatch
}

export default function AggregateResultsTable({ experiments, batch }: AggregateResultsTableProps) {
  const totalPlayers = experiments.reduce((sum, exp) => sum + exp.players.length, 0)
  const totalPlaying = experiments.reduce((sum, exp) => sum + exp.matches.filter((m) => m.status === 'playing').length, 0)
  const totalCompleted = experiments.reduce((sum, exp) => sum + exp.matches.filter((m) => m.status === 'completed').length, 0)

  if (!experiments.some((exp) => exp.matches.length > 0)) return null

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title">Results by Variation</h2>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Variation</th>
                <th>Players</th>
                <th>Matches</th>
                <th>Playing</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((exp, idx) => {
                const playing = exp.matches.filter((m) => m.status === 'playing').length
                const completed = exp.matches.filter((m) => m.status === 'completed').length
                return (
                  <tr key={exp.id}>
                    <td className="font-medium">
                      V{idx + 1}: {getVariationLabel(exp.parameters, batch.variations)}
                    </td>
                    <td>{exp.players.length}</td>
                    <td>{exp.matches.length}</td>
                    <td className="text-warning">{playing}</td>
                    <td className="text-success">{completed}</td>
                  </tr>
                )
              })}
              <tr className="font-semibold border-t-2 border-base-300">
                <td>Total</td>
                <td>{totalPlayers}</td>
                <td>{experiments.reduce((sum, exp) => sum + exp.matches.length, 0)}</td>
                <td className="text-warning">{totalPlaying}</td>
                <td className="text-success">{totalCompleted}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

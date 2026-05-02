import { Panel } from '@/components/ds/card'
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
    <Panel>
      <h2 className="t-h2 mb-3">Results by Variation</h2>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left t-micro px-3 py-2">Variation</th>
              <th className="text-right t-micro px-3 py-2">Players</th>
              <th className="text-right t-micro px-3 py-2">Matches</th>
              <th className="text-right t-micro px-3 py-2">Playing</th>
              <th className="text-right t-micro px-3 py-2">Completed</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((exp, idx) => {
              const playing = exp.matches.filter((m) => m.status === 'playing').length
              const completed = exp.matches.filter((m) => m.status === 'completed').length
              return (
                <tr key={exp.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-medium">
                    V{idx + 1}: {getVariationLabel(exp.parameters, batch.variations)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{exp.players.length}</td>
                  <td className="px-3 py-2 text-right font-mono">{exp.matches.length}</td>
                  <td className="px-3 py-2 text-right font-mono text-warn">{playing}</td>
                  <td className="px-3 py-2 text-right font-mono text-pos">{completed}</td>
                </tr>
              )
            })}
            <tr className="border-t-2 border-border bg-muted font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right font-mono">{totalPlayers}</td>
              <td className="px-3 py-2 text-right font-mono">{experiments.reduce((sum, exp) => sum + exp.matches.length, 0)}</td>
              <td className="px-3 py-2 text-right font-mono text-warn">{totalPlaying}</td>
              <td className="px-3 py-2 text-right font-mono text-pos">{totalCompleted}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

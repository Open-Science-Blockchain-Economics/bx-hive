import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
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

const statusToTone: Record<string, 'pos' | 'warn' | 'neutral'> = {
  active: 'pos',
  closed: 'warn',
  completed: 'neutral',
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
    <Panel>
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <div className="font-semibold">
            Variation {variationIndex + 1}: {variationLabel}
          </div>
          <div className="text-sm text-muted-foreground">
            {experiment.players.length} players · {playing} playing · {completed} completed
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Chip tone={statusToTone[experiment.status] ?? 'neutral'}>{experiment.status}</Chip>
          {experiment.status === 'active' ? (
            <Btn variant="danger" size="sm" onClick={() => onClose(experiment.id)} disabled={actionInProgress}>
              Close
            </Btn>
          ) : (
            <Btn variant="primary" size="sm" onClick={() => onReopen(experiment.id)} disabled={actionInProgress}>
              Reopen
            </Btn>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {variations.map((v) => (
          <div key={v.parameterName}>
            <span className="text-muted-foreground">{v.parameterName}: </span>
            <span className="font-mono font-medium">{experiment.parameters[v.parameterName]}</span>
          </div>
        ))}
      </div>

      {experiment.players.length > 0 && showPlayers && (
        <div className="mt-4">
          <div className="t-micro mb-2">Registered Players</div>
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left t-micro px-3 py-2">Player</th>
                  <th className="text-left t-micro px-3 py-2">Registered At</th>
                </tr>
              </thead>
              <tbody>
                {experiment.players.map((player) => {
                  const user = users.find((u) => u.id === player.userId)
                  return (
                    <tr key={player.userId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2">{user?.name || 'Unknown'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(player.registeredAt).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  )
}

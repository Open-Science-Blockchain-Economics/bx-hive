import { useParams } from 'react-router-dom'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Lock, Unlock } from 'lucide-react'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { EXPERIMENT_RESULTS_COMPONENTS } from '../components/experimenter/results'
import { PageHeader } from '../components/ui'
import { closeExperimentRegistration, getExperimentById, getUsers, updateExperimentStatus } from '../db'
import { getTemplateById } from '../experiment-logic/templates'
import { queryKeys } from '../lib/queryKeys'

const statusToTone: Record<string, 'pos' | 'warn' | 'neutral'> = {
  active: 'pos',
  closed: 'warn',
  completed: 'neutral',
}

export default function ExperimentDetails() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const queryClient = useQueryClient()

  const { data } = useSuspenseQuery({
    queryKey: queryKeys.experimentDetails(experimentId!),
    queryFn: async () => {
      const [experiment, users] = await Promise.all([getExperimentById(experimentId!), getUsers()])
      if (!experiment) throw new Error('Experiment not found')
      return { experiment, users }
    },
  })

  const closeRegistrationMutation = useMutation({
    mutationFn: () => closeExperimentRegistration(experimentId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.experimentDetails(experimentId ?? '') }),
  })

  const reopenRegistrationMutation = useMutation({
    mutationFn: () => updateExperimentStatus(experimentId!, 'active'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.experimentDetails(experimentId ?? '') }),
  })

  const actionInProgress = closeRegistrationMutation.isPending || reopenRegistrationMutation.isPending
  const actionError = (closeRegistrationMutation.error ?? reopenRegistrationMutation.error)?.message ?? null

  const { experiment, users } = data
  const template = getTemplateById(experiment.templateId)
  const playingMatches = experiment.matches.filter((m) => m.status === 'playing')
  const completedMatches = experiment.matches.filter((m) => m.status === 'completed')
  const ResultsComponent = EXPERIMENT_RESULTS_COMPONENTS[experiment.templateId as keyof typeof EXPERIMENT_RESULTS_COMPONENTS]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={experiment.name}
        backTo="/dashboard/experimenter"
        backTooltip="Back to Experimenter Dashboard"
        subtitle={
          <>
            <span>{template?.label || template?.name || experiment.templateId}</span>
            <span className="text-faint">·</span>
            <span>Created {new Date(experiment.createdAt).toLocaleDateString()}</span>
          </>
        }
        badges={<Chip tone={statusToTone[experiment.status] ?? 'neutral'}>{experiment.status}</Chip>}
      />

      <Panel>
        <h2 className="t-h2 mb-1">Experiment Configuration</h2>
        <p className="text-sm text-muted-foreground mb-4">Parameters cannot be changed after experiment creation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {template?.parameterSchema.map((param) => (
            <div key={param.name}>
              <span className="t-micro">{param.label}</span>
              <div className="mt-1 px-3 py-2 bg-muted rounded-sm font-semibold font-mono">{experiment.parameters[param.name]}</div>
              {param.description && <p className="text-xs text-muted-foreground mt-1">{param.description}</p>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="t-h2 mb-3">Experiment Management</h2>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration Status:</span>
                <span className={`font-semibold ${experiment.status === 'active' ? 'text-pos' : 'text-warn'}`}>
                  {experiment.status === 'active' ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Players:</span>
                <span className="font-semibold font-mono">{experiment.players.length}</span>
              </div>
              {template?.playerCount === 2 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Playing:</span>
                    <span className="font-semibold font-mono text-warn">{playingMatches.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-semibold font-mono text-pos">{completedMatches.length}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {experiment.status === 'active' && (
              <Btn variant="danger" onClick={() => closeRegistrationMutation.mutate()} disabled={actionInProgress}>
                {closeRegistrationMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Closing…
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" /> Close registration
                  </>
                )}
              </Btn>
            )}
            {experiment.status === 'closed' && (
              <Btn variant="primary" onClick={() => reopenRegistrationMutation.mutate()} disabled={actionInProgress}>
                {reopenRegistrationMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Reopening…
                  </>
                ) : (
                  <>
                    <Unlock className="size-3.5" /> Reopen registration
                  </>
                )}
              </Btn>
            )}
          </div>
        </div>
        {actionError && (
          <div role="alert" className="mt-4 rounded-sm border border-neg/35 bg-neg-bg text-neg px-3 py-2.5 text-sm">
            {actionError}
          </div>
        )}
        {experiment.status === 'active' && (
          <div role="alert" className="mt-4 rounded-sm border border-info/35 bg-info-bg text-info px-3 py-2.5 text-sm">
            Closing registration will prevent new players from joining. Existing players can still complete their matches.
          </div>
        )}
      </Panel>

      {experiment.players.length > 0 && (
        <Panel>
          <h2 className="t-h2 mb-3">Registered Players ({experiment.players.length})</h2>
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
        </Panel>
      )}

      {experiment.matches.length > 0 && ResultsComponent && <ResultsComponent experiment={experiment} users={users} />}
    </div>
  )
}

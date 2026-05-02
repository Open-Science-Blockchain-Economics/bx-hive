import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { Chip } from '@/components/ds/badge'
import { Panel } from '@/components/ds/card'
import { cn } from '@/lib/utils'
import { EXPERIMENT_RESULTS_COMPONENTS } from '../components/experimenter/results'
import AggregateResultsTable from '../components/experimenter/batch-details/AggregateResultsTable'
import BatchConfigCard from '../components/experimenter/batch-details/BatchConfigCard'
import BatchManagementCard from '../components/experimenter/batch-details/BatchManagementCard'
import VariationDetail from '../components/experimenter/batch-details/VariationDetail'
import { PageHeader, StatusBadge } from '../components/ui'
import { getBatchById, getExperimentsByBatchId, getUsers, getVariationLabel, updateBatch, updateExperimentStatus } from '../db'
import { getTemplateById } from '../experiment-logic/templates'
import { queryKeys } from '../lib/queryKeys'

export default function BatchDetails() {
  const { batchId } = useParams<{ batchId: string }>()
  const queryClient = useQueryClient()

  const [activeVariationTab, setActiveVariationTab] = useState<number | 'all'>('all')

  const { data } = useSuspenseQuery({
    queryKey: queryKeys.batchDetails(batchId!),
    queryFn: async () => {
      const [batch, users] = await Promise.all([getBatchById(batchId!), getUsers()])
      if (!batch) throw new Error('Batch not found')
      const experiments = await getExperimentsByBatchId(batchId!)
      return { batch, experiments, users }
    },
  })

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.batchDetails(batchId ?? '') })
  }

  const closeVariationMutation = useMutation({
    mutationFn: (experimentId: string) => updateExperimentStatus(experimentId, 'closed'),
    onSuccess: invalidate,
  })

  const reopenVariationMutation = useMutation({
    mutationFn: (experimentId: string) => updateExperimentStatus(experimentId, 'active'),
    onSuccess: invalidate,
  })

  const closeBatchMutation = useMutation({
    mutationFn: async () => {
      if (!data) return
      for (const exp of data.experiments) {
        if (exp.status === 'active') await updateExperimentStatus(exp.id, 'closed')
      }
      await updateBatch({ ...data.batch, status: 'closed' })
    },
    onSuccess: invalidate,
  })

  const reopenBatchMutation = useMutation({
    mutationFn: async () => {
      if (!data) return
      for (const exp of data.experiments) {
        if (exp.status === 'closed') await updateExperimentStatus(exp.id, 'active')
      }
      await updateBatch({ ...data.batch, status: 'active' })
    },
    onSuccess: invalidate,
  })

  const actionInProgress =
    closeVariationMutation.isPending || reopenVariationMutation.isPending || closeBatchMutation.isPending || reopenBatchMutation.isPending

  const { batch, experiments, users } = data
  const template = getTemplateById(batch.templateId)
  const displayedExperiments = activeVariationTab === 'all' ? experiments : [experiments[activeVariationTab]]
  const ResultsComponent =
    activeVariationTab !== 'all' && displayedExperiments[0]?.matches.length > 0
      ? EXPERIMENT_RESULTS_COMPONENTS[displayedExperiments[0].templateId as keyof typeof EXPERIMENT_RESULTS_COMPONENTS]
      : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={batch.name}
        backTo="/dashboard/experimenter"
        backTooltip="Back to Experimenter Dashboard"
        subtitle={
          <>
            <span>{template?.label || template?.name || batch.templateId}</span>
            <span className="text-faint">·</span>
            <span>Created {new Date(batch.createdAt).toLocaleDateString()}</span>
          </>
        }
        badges={
          <>
            <Chip tone="accent">Batch</Chip>
            <StatusBadge status={batch.status} />
          </>
        }
      />

      <BatchConfigCard batch={batch} variationCount={experiments.length} />

      <BatchManagementCard
        batch={batch}
        experiments={experiments}
        actionInProgress={actionInProgress}
        onCloseBatch={() => closeBatchMutation.mutate()}
        onReopenBatch={() => reopenBatchMutation.mutate()}
      />

      <Panel>
        <h2 className="t-h2 mb-4">Variations</h2>
        <div role="tablist" className="flex flex-wrap gap-1 mb-4 border-b border-border">
          <button
            type="button"
            role="tab"
            aria-selected={activeVariationTab === 'all'}
            onClick={() => setActiveVariationTab('all')}
            className={cn(
              'px-3 py-2 -mb-px border-b-2 text-sm font-medium transition-colors',
              activeVariationTab === 'all'
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground',
            )}
          >
            All
          </button>
          {experiments.map((exp, idx) => (
            <button
              key={exp.id}
              type="button"
              role="tab"
              aria-selected={activeVariationTab === idx}
              onClick={() => setActiveVariationTab(idx)}
              className={cn(
                'px-3 py-2 -mb-px border-b-2 text-sm font-medium transition-colors',
                activeVariationTab === idx
                  ? 'text-foreground border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground',
              )}
            >
              {getVariationLabel(exp.parameters, batch.variations)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {displayedExperiments.map((exp, idx) => {
            const actualIndex = activeVariationTab === 'all' ? idx : (activeVariationTab as number)
            return (
              <VariationDetail
                key={exp.id}
                experiment={exp}
                variationIndex={actualIndex}
                variations={batch.variations}
                users={users}
                showPlayers={activeVariationTab !== 'all'}
                actionInProgress={actionInProgress}
                onClose={closeVariationMutation.mutate}
                onReopen={reopenVariationMutation.mutate}
              />
            )
          })}
        </div>
      </Panel>

      <AggregateResultsTable experiments={experiments} batch={batch} />

      {ResultsComponent && <ResultsComponent experiment={displayedExperiments[0]} users={users} />}
    </div>
  )
}

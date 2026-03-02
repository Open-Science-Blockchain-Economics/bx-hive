import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.name}
        backTo="/dashboard/experimenter"
        backTooltip="Back to Experimenter Dashboard"
        subtitle={
          <>
            <span className="text-base-content/70">{template?.label || template?.name || batch.templateId}</span>
            <span className="text-base-content/50">&bull;</span>
            <span className="text-sm text-base-content/50">Created {new Date(batch.createdAt).toLocaleDateString()}</span>
          </>
        }
        badges={
          <>
            <span className="badge badge-primary badge-lg">BATCH</span>
            <StatusBadge status={batch.status} size="lg" />
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

      {/* Variation Tabs */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title mb-4">Variations</h2>

          <div role="tablist" className="tabs tabs-boxed mb-4">
            <a
              role="tab"
              className={`tab ${activeVariationTab === 'all' ? 'tab-active' : ''}`}
              onClick={() => setActiveVariationTab('all')}
            >
              All
            </a>
            {experiments.map((exp, idx) => (
              <a
                key={exp.id}
                role="tab"
                className={`tab ${activeVariationTab === idx ? 'tab-active' : ''}`}
                onClick={() => setActiveVariationTab(idx)}
              >
                {getVariationLabel(exp.parameters, batch.variations)}
              </a>
            ))}
          </div>

          <div className="space-y-4">
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
        </div>
      </div>

      <AggregateResultsTable experiments={experiments} batch={batch} />

      {/* Detailed Results per Variation */}
      {activeVariationTab !== 'all' &&
        displayedExperiments[0].matches.length > 0 &&
        (() => {
          const ResultsComponent =
            EXPERIMENT_RESULTS_COMPONENTS[displayedExperiments[0].templateId as keyof typeof EXPERIMENT_RESULTS_COMPONENTS]
          return ResultsComponent ? <ResultsComponent experiment={displayedExperiments[0]} users={users} /> : null
        })()}
    </div>
  )
}
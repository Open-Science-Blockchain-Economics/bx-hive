import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EXPERIMENT_RESULTS_COMPONENTS } from '../components/experimenter/results'
import AggregateResultsTable from '../components/experimenter/batch-details/AggregateResultsTable'
import BatchConfigCard from '../components/experimenter/batch-details/BatchConfigCard'
import BatchManagementCard from '../components/experimenter/batch-details/BatchManagementCard'
import VariationDetail from '../components/experimenter/batch-details/VariationDetail'
import { LoadingSpinner, ErrorMessage, PageHeader, StatusBadge } from '../components/ui'
import { getBatchById, getExperimentsByBatchId, getUsers, getVariationLabel, updateBatch, updateExperimentStatus } from '../db'
import { getTemplateById } from '../experiment-logic/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Experiment, ExperimentBatch, User } from '../types'

export default function BatchDetails() {
  const { batchId } = useParams<{ batchId: string }>()
  const { activeUser } = useActiveUser()
  const [batch, setBatch] = useState<ExperimentBatch | null>(null)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [activeVariationTab, setActiveVariationTab] = useState<number | 'all'>('all')

  useEffect(() => {
    if (batchId && activeUser) loadBatchData()
  }, [batchId, activeUser])

  async function loadBatchData() {
    if (!batchId) return
    try {
      setLoading(true)
      setError(null)
      const [batchData, allUsers] = await Promise.all([getBatchById(batchId), getUsers()])
      if (!batchData) {
        setError('Batch not found')
        return
      }
      const batchExperiments = await getExperimentsByBatchId(batchId)
      setBatch(batchData)
      setExperiments(batchExperiments)
      setUsers(allUsers)
    } catch (err) {
      console.error('Failed to load batch:', err)
      setError('Failed to load batch data')
    } finally {
      setLoading(false)
    }
  }

  async function handleCloseVariation(experimentId: string) {
    try {
      setActionInProgress(true)
      await updateExperimentStatus(experimentId, 'closed')
      await loadBatchData()
    } catch (err) {
      console.error('Failed to close variation:', err)
      setError(err instanceof Error ? err.message : 'Failed to close variation')
    } finally {
      setActionInProgress(false)
    }
  }

  async function handleReopenVariation(experimentId: string) {
    try {
      setActionInProgress(true)
      await updateExperimentStatus(experimentId, 'active')
      await loadBatchData()
    } catch (err) {
      console.error('Failed to reopen variation:', err)
      setError(err instanceof Error ? err.message : 'Failed to reopen variation')
    } finally {
      setActionInProgress(false)
    }
  }

  async function handleCloseBatch() {
    if (!batch) return
    try {
      setActionInProgress(true)
      for (const exp of experiments) {
        if (exp.status === 'active') await updateExperimentStatus(exp.id, 'closed')
      }
      await updateBatch({ ...batch, status: 'closed' })
      await loadBatchData()
    } catch (err) {
      console.error('Failed to close batch:', err)
      setError(err instanceof Error ? err.message : 'Failed to close batch')
    } finally {
      setActionInProgress(false)
    }
  }

  async function handleReopenBatch() {
    if (!batch) return
    try {
      setActionInProgress(true)
      for (const exp of experiments) {
        if (exp.status === 'closed') await updateExperimentStatus(exp.id, 'active')
      }
      await updateBatch({ ...batch, status: 'active' })
      await loadBatchData()
    } catch (err) {
      console.error('Failed to reopen batch:', err)
      setError(err instanceof Error ? err.message : 'Failed to reopen batch')
    } finally {
      setActionInProgress(false)
    }
  }

  if (loading) return <LoadingSpinner />

  if (error || !batch || !activeUser) {
    return <ErrorMessage message={error || 'Something went wrong'} />
  }

  const template = getTemplateById(batch.templateId)
  const displayedExperiments = activeVariationTab === 'all' ? experiments : [experiments[activeVariationTab]]

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.name}
        backTo="/dashboard/experimenter"
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
        onCloseBatch={() => void handleCloseBatch()}
        onReopenBatch={() => void handleReopenBatch()}
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
                  onClose={handleCloseVariation}
                  onReopen={handleReopenVariation}
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

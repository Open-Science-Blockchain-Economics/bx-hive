import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EXPERIMENT_RESULTS_COMPONENTS } from '../components/experimenter/results'
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
    if (batchId && activeUser) {
      loadBatchData()
    }
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
      // Close all experiments in the batch
      for (const exp of experiments) {
        if (exp.status === 'active') {
          await updateExperimentStatus(exp.id, 'closed')
        }
      }
      // Update batch status
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
      // Reopen all experiments in the batch
      for (const exp of experiments) {
        if (exp.status === 'closed') {
          await updateExperimentStatus(exp.id, 'active')
        }
      }
      // Update batch status
      await updateBatch({ ...batch, status: 'active' })
      await loadBatchData()
    } catch (err) {
      console.error('Failed to reopen batch:', err)
      setError(err instanceof Error ? err.message : 'Failed to reopen batch')
    } finally {
      setActionInProgress(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (error || !batch || !activeUser) {
    return (
      <div className="text-center py-12">
        <p className="text-error">{error || 'Something went wrong'}</p>
        <Link to="/dashboard/experimenter" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const template = getTemplateById(batch.templateId)
  const totalPlayers = experiments.reduce((sum, exp) => sum + exp.players.length, 0)
  const totalPlaying = experiments.reduce((sum, exp) => sum + exp.matches.filter((m) => m.status === 'playing').length, 0)
  const totalCompleted = experiments.reduce((sum, exp) => sum + exp.matches.filter((m) => m.status === 'completed').length, 0)
  const activeCount = experiments.filter((e) => e.status === 'active').length

  // Get the experiments to display based on the active tab
  const displayedExperiments = activeVariationTab === 'all' ? experiments : [experiments[activeVariationTab]]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/dashboard/experimenter" className="btn btn-ghost btn-sm mb-4">
          ← Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{batch.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-base-content/70">{template?.label || template?.name || batch.templateId}</span>
              <span className="text-base-content/50">•</span>
              <span className="text-sm text-base-content/50">Created {new Date(batch.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-primary badge-lg">BATCH</span>
            <span
              className={`badge badge-lg ${
                batch.status === 'active' ? 'badge-success' : batch.status === 'closed' ? 'badge-warning' : 'badge-neutral'
              }`}
            >
              {batch.status === 'active' && 'Active'}
              {batch.status === 'closed' && 'Closed'}
              {batch.status === 'completed' && 'Completed'}
            </span>
          </div>
        </div>
      </div>

      {/* Batch Configuration */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title">Batch Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <span className="text-sm text-base-content/70">Assignment Strategy</span>
              <div className="font-semibold">{batch.assignmentStrategy === 'round_robin' ? 'Round Robin' : 'Fill Sequential'}</div>
            </div>
            <div>
              <span className="text-sm text-base-content/70">Max Per Variation</span>
              <div className="font-semibold">{batch.maxPerVariation ?? 'No limit'}</div>
            </div>
            <div>
              <span className="text-sm text-base-content/70">Varied Parameters</span>
              <div className="font-semibold">{batch.variations.map((v) => v.parameterName).join(', ')}</div>
            </div>
            <div>
              <span className="text-sm text-base-content/70">Number of Variations</span>
              <div className="font-semibold">{experiments.length}</div>
            </div>
          </div>

          <div className="divider">Base Parameters</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {template?.parameterSchema
              .filter((param) => !batch.variations.some((v) => v.parameterName === param.name))
              .map((param) => (
                <div key={param.name}>
                  <span className="text-sm text-base-content/70">{param.label}</span>
                  <div className="font-semibold">{batch.baseParameters[param.name]}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Batch Management */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title">Batch Management</h2>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Active Variations:</span>
                  <span className="font-semibold">
                    {activeCount} / {experiments.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Total Players:</span>
                  <span className="font-semibold">{totalPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Playing:</span>
                  <span className="font-semibold text-warning">{totalPlaying}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Completed:</span>
                  <span className="font-semibold text-success">{totalCompleted}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {batch.status === 'active' && (
                <button className="btn btn-warning" onClick={handleCloseBatch} disabled={actionInProgress}>
                  {actionInProgress ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Closing...
                    </>
                  ) : (
                    <>Close All Variations</>
                  )}
                </button>
              )}

              {batch.status === 'closed' && (
                <button className="btn btn-success" onClick={handleReopenBatch} disabled={actionInProgress}>
                  {actionInProgress ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Reopening...
                    </>
                  ) : (
                    <>Reopen All Variations</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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

          {/* Variation Details */}
          <div className="space-y-4">
            {displayedExperiments.map((exp, idx) => {
              const variationLabel = getVariationLabel(exp.parameters, batch.variations)
              const playing = exp.matches.filter((m) => m.status === 'playing').length
              const completed = exp.matches.filter((m) => m.status === 'completed').length
              const actualIndex = activeVariationTab === 'all' ? idx : (activeVariationTab as number)

              return (
                <div key={exp.id} className="border border-base-300 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">Variation {actualIndex + 1}: {variationLabel}</div>
                      <div className="text-sm text-base-content/70">
                        {exp.players.length} players • {playing} playing • {completed} completed
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge ${
                          exp.status === 'active' ? 'badge-success' : exp.status === 'closed' ? 'badge-warning' : 'badge-neutral'
                        }`}
                      >
                        {exp.status}
                      </span>
                      {exp.status === 'active' ? (
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => handleCloseVariation(exp.id)}
                          disabled={actionInProgress}
                        >
                          Close
                        </button>
                      ) : (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleReopenVariation(exp.id)}
                          disabled={actionInProgress}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Show variation-specific parameters */}
                  <div className="flex gap-4 text-sm">
                    {batch.variations.map((v) => (
                      <div key={v.parameterName}>
                        <span className="text-base-content/70">{v.parameterName}: </span>
                        <span className="font-medium">{exp.parameters[v.parameterName]}</span>
                      </div>
                    ))}
                  </div>

                  {/* Players table for this variation */}
                  {exp.players.length > 0 && activeVariationTab !== 'all' && (
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
                            {exp.players.map((player) => {
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
            })}
          </div>
        </div>
      </div>

      {/* Aggregate Results */}
      {experiments.some((exp) => exp.matches.length > 0) && (
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
                        <td className="font-medium">V{idx + 1}: {getVariationLabel(exp.parameters, batch.variations)}</td>
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
      )}

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
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createExperiment, getExperimentsByExperimenter } from '../db'
import { experimentTemplates, getTemplateById } from '../experiment-logic/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Experiment } from '../types'

type TabType = 'experiments' | 'create'

export default function ExperimenterDashboard() {
  const { activeUser } = useActiveUser()
  const [activeTab, setActiveTab] = useState<TabType>('experiments')
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)

  // Create experiment form state
  const [selectedTemplateId, setSelectedTemplateId] = useState(experimentTemplates[0]?.id || '')
  const [experimentName, setExperimentName] = useState('')
  const [parameters, setParameters] = useState<Record<string, number | string>>({})
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate = getTemplateById(selectedTemplateId)

  useEffect(() => {
    if (activeUser) {
      loadExperiments()
    }
  }, [activeUser])

  useEffect(() => {
    if (selectedTemplate) {
      const defaults: Record<string, number | string> = {}
      selectedTemplate.parameterSchema.forEach((param) => {
        if (param.default !== undefined) {
          defaults[param.name] = param.default
        }
      })
      setParameters(defaults)
    }
  }, [selectedTemplate])

  async function loadExperiments() {
    if (!activeUser) return
    try {
      setLoading(true)
      const experimenterExperiments = await getExperimentsByExperimenter(activeUser.id)
      setExperiments(experimenterExperiments)
    } catch (err) {
      console.error('Failed to load experiments:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateExperiment() {
    setError(null)

    if (!experimentName.trim()) {
      setError('Experiment name is required')
      return
    }

    if (!activeUser || !selectedTemplate) return

    try {
      setCreating(true)
      await createExperiment(selectedTemplateId, activeUser.id, experimentName.trim(), parameters)
      setExperimentName('')
      await loadExperiments()
      setActiveTab('experiments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experiment')
    } finally {
      setCreating(false)
    }
  }

  function handleParameterChange(name: string, value: string, type: 'number' | 'string') {
    setParameters((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  // Calculate max payout for trust game
  const maxPayout =
    selectedTemplateId === 'trust-game' ? (Number(parameters.E1) || 0) * (Number(parameters.m) || 1) + (Number(parameters.E2) || 0) : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Experimenter Dashboard</h1>
        <p className="text-base-content/70 mt-2">Create and manage experiments</p>
      </div>

      <div role="tablist" className="tabs tabs-boxed mb-6">
        <a role="tab" className={`tab ${activeTab === 'experiments' ? 'tab-active' : ''}`} onClick={() => setActiveTab('experiments')}>
          My Experiments
        </a>
        <a role="tab" className={`tab ${activeTab === 'create' ? 'tab-active' : ''}`} onClick={() => setActiveTab('create')}>
          Create New
        </a>
      </div>

      {activeTab === 'experiments' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : experiments.length === 0 ? (
            <div className="text-center py-12 text-base-content/70">
              <p>No experiments yet. Create your first experiment!</p>
              <button className="btn btn-primary mt-4" onClick={() => setActiveTab('create')}>
                Create Experiment
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {experiments.map((experiment) => {
                const template = getTemplateById(experiment.templateId)
                const playingMatches = experiment.matches.filter((m) => m.status === 'playing')
                const completedMatches = experiment.matches.filter((m) => m.status === 'completed')

                return (
                  <div key={experiment.id} className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to={`/experimenter/experiment/${experiment.id}`}>
                            <h3 className="card-title hover:text-primary transition-colors cursor-pointer">{experiment.name}</h3>
                          </Link>
                          <p className="text-sm text-base-content/70">{template?.label || template?.name || experiment.templateId}</p>
                        </div>
                        <span
                          className={`badge ${
                            experiment.status === 'active' ? 'badge-success' : experiment.status === 'closed' ? 'badge-warning' : 'badge-neutral'
                          }`}
                        >
                          {experiment.status}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-4 text-sm mt-2">
                        <div>
                          <span className="text-base-content/70">Players: </span>
                          <span className="font-medium">{experiment.players.length}</span>
                        </div>
                        {template?.playerCount === 2 && (
                          <>
                            <div>
                              <span className="text-base-content/70">Playing: </span>
                              <span className="font-medium text-warning">{playingMatches.length}</span>
                            </div>
                            <div>
                              <span className="text-base-content/70">Completed: </span>
                              <span className="font-medium text-success">{completedMatches.length}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Create New Experiment</h2>

            <div className="space-y-3">
              {/* Step 1: Template Selection */}
              <div>
                <h3 className="font-semibold text-lg mb-2">1. Select Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {experimentTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`card bg-base-100 border-2 cursor-pointer transition-all ${
                        selectedTemplateId === template.id ? 'border-primary shadow-lg' : 'border-base-300 hover:border-base-400'
                      }`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <div className="card-body">
                        <div className="flex justify-between items-start">
                          <h4 className="card-title text-lg">{template.name}</h4>
                          <span className="badge badge-neutral badge-sm">{template.playerCount}-player</span>
                        </div>
                        <p className="text-sm text-base-content/70">{template.description}</p>
                        {selectedTemplateId === template.id && (
                          <div className="mt-2">
                            <span className="badge badge-primary">Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Experiment Details */}
              <div className="divider"></div>
              <div>
                <h3 className="font-semibold text-lg mb-4">2. Experiment Details</h3>
                <div className="form-control">
                  <span className="label-text font-medium mb-2">Experiment Name</span>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={experimentName}
                    onChange={(e) => setExperimentName(e.target.value)}
                    placeholder="e.g., Trust Experiment - Spring 2025"
                  />
                </div>
              </div>

              {/* Step 3: Parameters */}
              {selectedTemplate && (
                <>
                  <div className="divider"></div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3. Configure Parameters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.parameterSchema.map((param) => (
                        <div key={param.name} className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">{param.label}</span>
                          </label>
                          <input
                            type={param.type === 'number' ? 'number' : 'text'}
                            className="input input-bordered"
                            value={parameters[param.name] ?? ''}
                            onChange={(e) => handleParameterChange(param.name, e.target.value, param.type)}
                            min={param.min}
                            max={param.max}
                          />
                          {param.description && (
                            <label className="label">
                              <span className="label-text-alt text-base-content/60">{param.description}</span>
                            </label>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Max Payout Preview for Trust Game */}
                    {maxPayout !== null && (
                      <div className="alert alert-info mt-4">
                        <div>
                          <div className="font-semibold">Max Payout Per Pair:</div>
                          <div className="text-sm">{maxPayout}</div>
                          <div className="text-xs text-base-content/70 mt-1">
                            Calculated as: (E1 × m) + E2 = ({parameters.E1} × {parameters.m}) + {parameters.E2}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="card-actions justify-end mt-6">
              <button className="btn btn-primary" onClick={handleCreateExperiment} disabled={creating || !experimentName.trim()}>
                {creating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  'Create Experiment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

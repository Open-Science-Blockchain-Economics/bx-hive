import { useEffect, useState, useCallback } from 'react'
import { VariationBuilder } from '../components/experimenter/VariationBuilder'
import {
  createExperiment as dbCreateExperiment,
  createExperimentBatch,
  getBatchesByExperimenter,
  getExperimentsByBatchId,
  getExperimentsByExperimenter,
  getVariationLabel,
} from '../db'
import { experimentTemplates, getTemplateById } from '../experiment-logic/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments, type ExperimentGroup, type VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation } from '../hooks/useTrustVariation'
import type { AssignmentStrategy, Experiment, ExperimentBatch, ParameterVariation } from '../types'

type TabType = 'experiments' | 'create'

interface BatchWithExperiments extends ExperimentBatch {
  experiments: Experiment[]
}

interface OnChainExperiment {
  group: ExperimentGroup
  variations: VariationInfo[]
}

/** Expand parameter variations into factorial combinations */
function generateVariationCombinations(
  baseParams: Record<string, number | string>,
  variations: ParameterVariation[],
): Record<string, number | string>[] {
  let combinations: Record<string, number | string>[] = [{ ...baseParams }]
  for (const variation of variations) {
    const next: Record<string, number | string>[] = []
    for (const combo of combinations) {
      for (const value of variation.values) {
        next.push({ ...combo, [variation.parameterName]: value })
      }
    }
    combinations = next
  }
  return combinations
}

/** Convert trust-game frontend params (ALGO) to contract args (microAlgo) */
function toVariationParams(params: Record<string, number | string>, label: string) {
  return {
    label,
    e1: BigInt(Math.round(Number(params.E1) * 1_000_000)),
    e2: BigInt(Math.round(Number(params.E2) * 1_000_000)),
    multiplier: BigInt(Math.round(Number(params.m))),
    unit: BigInt(Math.round(Number(params.UNIT) * 1_000_000)),
    assetId: 0n,
  }
}

export default function ExperimenterDashboard() {
  const { activeUser } = useActiveUser()
  const { activeAddress } = useAlgorand()
  const { createExperiment, createVariation, listExperiments, listVariations } = useTrustExperiments()
  const { addSubjects, depositEscrow } = useTrustVariation()

  const [activeTab, setActiveTab] = useState<TabType>('experiments')

  // On-chain trust experiments
  const [onChainExps, setOnChainExps] = useState<OnChainExperiment[]>([])

  // Local BRET experiments (IndexedDB)
  const [localExperiments, setLocalExperiments] = useState<Experiment[]>([])
  const [localBatches, setLocalBatches] = useState<BatchWithExperiments[]>([])

  const [loading, setLoading] = useState(true)

  // Create form state
  const [selectedTemplateId, setSelectedTemplateId] = useState(experimentTemplates[0]?.id || '')
  const [experimentName, setExperimentName] = useState('')
  const [parameters, setParameters] = useState<Record<string, number | string>>({})
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Batch mode state
  const [batchModeEnabled, setBatchModeEnabled] = useState(false)
  const [variations, setVariations] = useState<ParameterVariation[]>([])
  const [assignmentStrategy, setAssignmentStrategy] = useState<AssignmentStrategy>('round_robin')
  const [maxPerVariation, setMaxPerVariation] = useState<string>('')

  // Subjects management (per variation appId as string)
  const [subjectInputs, setSubjectInputs] = useState<Record<string, string>>({})
  const [addingSubjects, setAddingSubjects] = useState<Record<string, boolean>>({})
  const [subjectErrors, setSubjectErrors] = useState<Record<string, string>>({})

  // Deposit escrow (per variation appId as string)
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({})
  const [depositing, setDepositing] = useState<Record<string, boolean>>({})
  const [depositErrors, setDepositErrors] = useState<Record<string, string>>({})

  // Expanded variation panels
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(new Set())

  const selectedTemplate = getTemplateById(selectedTemplateId)

  useEffect(() => {
    if (activeUser) {
      void loadAll()
    }
  }, [activeUser])

  useEffect(() => {
    if (selectedTemplate) {
      const defaults: Record<string, number | string> = {}
      selectedTemplate.parameterSchema.forEach((param) => {
        if (param.default !== undefined) defaults[param.name] = param.default
      })
      setParameters(defaults)
      setBatchModeEnabled(false)
      setVariations([])
    }
  }, [selectedTemplate])

  const loadAll = useCallback(async () => {
    if (!activeUser) return
    setLoading(true)
    try {
      await Promise.all([loadOnChainExperiments(), loadLocalExperiments()])
    } finally {
      setLoading(false)
    }
  }, [activeUser])

  async function loadOnChainExperiments() {
    try {
      const groups = await listExperiments()
      const mine = groups.filter((g) => g.owner === activeAddress)
      const withVariations = await Promise.all(
        mine.map(async (group) => ({
          group,
          variations: await listVariations(group.expId, Number(group.variationCount)),
        })),
      )
      setOnChainExps(withVariations)
    } catch (err) {
      console.error('Failed to load on-chain experiments:', err)
    }
  }

  async function loadLocalExperiments() {
    if (!activeUser) return
    try {
      const allExps = await getExperimentsByExperimenter(activeUser.id)
      setLocalExperiments(allExps.filter((e) => e.templateId === 'bret' && !e.batchId))

      const allBatches = await getBatchesByExperimenter(activeUser.id)
      const bretBatches = allBatches.filter((b) => b.templateId === 'bret')
      const withExps = await Promise.all(
        bretBatches.map(async (batch) => ({
          ...batch,
          experiments: await getExperimentsByBatchId(batch.id),
        })),
      )
      setLocalBatches(withExps)
    } catch (err) {
      console.error('Failed to load local experiments:', err)
    }
  }

  function handleParameterChange(name: string, value: string, type: 'number' | 'string') {
    setParameters((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  async function handleCreateExperiment() {
    setError(null)
    if (!experimentName.trim()) {
      setError('Experiment name is required')
      return
    }
    if (!activeUser || !selectedTemplate) return

    setCreating(true)
    try {
      if (selectedTemplateId === 'trust-game') {
        await createTrustGameOnChain()
      } else {
        await createBretLocal()
      }

      setExperimentName('')
      setBatchModeEnabled(false)
      setVariations([])
      setMaxPerVariation('')
      await loadAll()
      setActiveTab('experiments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experiment')
    } finally {
      setCreating(false)
    }
  }

  async function createTrustGameOnChain() {
    const expId = await createExperiment(experimentName.trim())

    if (batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)) {
      const combos = generateVariationCombinations(parameters, variations)
      for (let i = 0; i < combos.length; i++) {
        const label = getVariationLabel(combos[i], variations)
        await createVariation(expId, toVariationParams(combos[i], label))
      }
    } else {
      await createVariation(expId, toVariationParams(parameters, 'Default'))
    }
  }

  async function createBretLocal() {
    if (!activeUser) return
    if (batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)) {
      await createExperimentBatch(
        selectedTemplateId,
        activeUser.id,
        experimentName.trim(),
        parameters,
        variations,
        assignmentStrategy,
        maxPerVariation ? Number(maxPerVariation) : undefined,
      )
    } else {
      await dbCreateExperiment(selectedTemplateId, activeUser.id, experimentName.trim(), parameters)
    }
  }

  async function handleAddSubjects(appId: bigint) {
    const key = String(appId)
    const raw = subjectInputs[key] ?? ''
    const addresses = raw
      .split('\n')
      .map((a) => a.trim())
      .filter((a) => a.length > 0)

    if (addresses.length === 0) {
      setSubjectErrors((prev) => ({ ...prev, [key]: 'Enter at least one address' }))
      return
    }

    setAddingSubjects((prev) => ({ ...prev, [key]: true }))
    setSubjectErrors((prev) => ({ ...prev, [key]: '' }))
    try {
      await addSubjects(appId, addresses)
      setSubjectInputs((prev) => ({ ...prev, [key]: '' }))
    } catch (err) {
      setSubjectErrors((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'Failed to add subjects' }))
    } finally {
      setAddingSubjects((prev) => ({ ...prev, [key]: false }))
    }
  }

  async function handleDepositEscrow(appId: bigint) {
    const key = String(appId)
    const amount = Number(depositAmounts[key] ?? '0')
    if (!amount || amount <= 0) {
      setDepositErrors((prev) => ({ ...prev, [key]: 'Enter an amount > 0' }))
      return
    }

    setDepositing((prev) => ({ ...prev, [key]: true }))
    setDepositErrors((prev) => ({ ...prev, [key]: '' }))
    try {
      await depositEscrow(appId, amount)
      setDepositAmounts((prev) => ({ ...prev, [key]: '' }))
    } catch (err) {
      setDepositErrors((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'Failed to deposit' }))
    } finally {
      setDepositing((prev) => ({ ...prev, [key]: false }))
    }
  }

  function toggleVariation(appId: bigint) {
    const key = String(appId)
    setExpandedVariations((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const maxPayout =
    selectedTemplateId === 'trust-game'
      ? (Number(parameters.E1) || 0) * (Number(parameters.m) || 1) + (Number(parameters.E2) || 0)
      : null

  const hasOnChain = onChainExps.length > 0
  const hasLocal = localExperiments.length > 0 || localBatches.length > 0

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

      {/* ── Experiments List ── */}
      {activeTab === 'experiments' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : !hasOnChain && !hasLocal ? (
            <div className="text-center py-12 text-base-content/70">
              <p>No experiments yet. Create your first experiment!</p>
              <button className="btn btn-primary mt-4" onClick={() => setActiveTab('create')}>
                Create Experiment
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {/* ── On-chain Trust Game Experiments ── */}
              {onChainExps.map(({ group, variations: vars }) => (
                <div key={group.expId} className="card bg-base-100 border border-base-300">
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="card-title">{group.name}</h3>
                        <p className="text-sm text-base-content/70">
                          Trust Game • {Number(group.variationCount)} variation{Number(group.variationCount) !== 1 ? 's' : ''} • on-chain
                        </p>
                      </div>
                      <span className="badge badge-primary">TRUST</span>
                    </div>

                    {/* Variation cards */}
                    <div className="mt-3 space-y-3">
                      {vars.map((v) => {
                        const appIdKey = String(v.appId)
                        const isExpanded = expandedVariations.has(appIdKey)
                        return (
                          <div key={v.varId} className="border border-base-300 rounded-lg">
                            {/* Variation header */}
                            <button
                              type="button"
                              className="w-full flex justify-between items-center p-3 text-left hover:bg-base-200 rounded-lg"
                              onClick={() => toggleVariation(v.appId)}
                            >
                              <div>
                                <span className="font-medium">V{v.varId}: {v.label}</span>
                                <span className="text-xs text-base-content/50 ml-2">app #{String(v.appId)}</span>
                              </div>
                              <span className="text-base-content/50">{isExpanded ? '▲' : '▼'}</span>
                            </button>

                            {/* Management panel */}
                            {isExpanded && (
                              <div className="p-3 pt-0 space-y-4 border-t border-base-300">

                                {/* Deposit Escrow */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Deposit Escrow</h4>
                                  <div className="flex gap-2 items-start">
                                    <div className="flex-1">
                                      <input
                                        type="number"
                                        className="input input-bordered input-sm w-full"
                                        placeholder="Amount in ALGO"
                                        min={0}
                                        step={0.1}
                                        value={depositAmounts[appIdKey] ?? ''}
                                        onChange={(e) => setDepositAmounts((prev) => ({ ...prev, [appIdKey]: e.target.value }))}
                                        disabled={depositing[appIdKey]}
                                      />
                                      {depositErrors[appIdKey] && (
                                        <p className="text-error text-xs mt-1">{depositErrors[appIdKey]}</p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-secondary"
                                      onClick={() => void handleDepositEscrow(v.appId)}
                                      disabled={depositing[appIdKey]}
                                    >
                                      {depositing[appIdKey] ? <span className="loading loading-spinner loading-xs"></span> : 'Deposit'}
                                    </button>
                                  </div>
                                </div>

                                {/* Add Subjects */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Add Subjects</h4>
                                  <p className="text-xs text-base-content/60 mb-2">One wallet address per line</p>
                                  <textarea
                                    className="textarea textarea-bordered w-full text-xs font-mono"
                                    rows={3}
                                    placeholder={"ABCDEF...\nGHIJKL..."}
                                    value={subjectInputs[appIdKey] ?? ''}
                                    onChange={(e) => setSubjectInputs((prev) => ({ ...prev, [appIdKey]: e.target.value }))}
                                    disabled={addingSubjects[appIdKey]}
                                  />
                                  {subjectErrors[appIdKey] && (
                                    <p className="text-error text-xs mt-1">{subjectErrors[appIdKey]}</p>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary mt-2"
                                    onClick={() => void handleAddSubjects(v.appId)}
                                    disabled={addingSubjects[appIdKey]}
                                  >
                                    {addingSubjects[appIdKey] ? <span className="loading loading-spinner loading-xs"></span> : 'Add Subjects'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* ── Local BRET Batches ── */}
              {localBatches.map((batch) => {
                const template = getTemplateById(batch.templateId)
                return (
                  <div key={batch.id} className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="card-title">{batch.name}</h3>
                          <p className="text-sm text-base-content/70">
                            {template?.label || batch.templateId} • {batch.experiments.length} variations •{' '}
                            {batch.assignmentStrategy === 'round_robin' ? 'Round Robin' : 'Fill Sequential'}
                          </p>
                        </div>
                        <span className="badge badge-neutral">BATCH</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                        {batch.experiments.map((exp, idx) => {
                          const varLabel = getVariationLabel(exp.parameters, batch.variations)
                          return (
                            <div key={exp.id} className="bg-base-200 rounded-lg p-2 text-sm">
                              <div className="font-medium">V{idx + 1}: {varLabel}</div>
                              <div className="text-xs text-base-content/70">{exp.players.length} players</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* ── Local BRET standalone ── */}
              {localExperiments.map((experiment) => {
                const template = getTemplateById(experiment.templateId)
                return (
                  <div key={experiment.id} className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="card-title">{experiment.name}</h3>
                          <p className="text-sm text-base-content/70">{template?.label || experiment.templateId}</p>
                        </div>
                        <span
                          className={`badge ${
                            experiment.status === 'active' ? 'badge-success' : experiment.status === 'closed' ? 'badge-warning' : 'badge-neutral'
                          }`}
                        >
                          {experiment.status}
                        </span>
                      </div>
                      <div className="text-sm mt-2">
                        <span className="text-base-content/70">Players: </span>
                        <span className="font-medium">{experiment.players.length}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Create Experiment ── */}
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
                          <div className="flex gap-2 mt-2">
                            <span className="badge badge-primary">Selected</span>
                            {template.id === 'trust-game' && <span className="badge badge-secondary badge-sm">on-chain</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Name */}
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
                    placeholder="e.g., Trust Experiment – Spring 2025"
                  />
                </div>
              </div>

              {/* Step 3: Parameters */}
              {selectedTemplate && (
                <>
                  <div className="divider"></div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3. Configure Base Parameters</h3>
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

                    {maxPayout !== null && !batchModeEnabled && (
                      <div className="alert alert-info mt-4">
                        <div>
                          <div className="font-semibold">Max Payout Per Pair: {maxPayout} ALGO</div>
                          <div className="text-xs text-base-content/70 mt-1">
                            (E1 × m) + E2 = ({parameters.E1} × {parameters.m}) + {parameters.E2}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 4: Parameter Variations */}
                  <div className="divider"></div>
                  <div>
                    <h3 className="font-semibold text-lg mb-4">4. Parameter Variations (Optional)</h3>
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={batchModeEnabled}
                        onChange={(e) => {
                          setBatchModeEnabled(e.target.checked)
                          if (!e.target.checked) setVariations([])
                        }}
                      />
                      <span className="label-text">Enable batch mode – create multiple variations</span>
                    </label>

                    {batchModeEnabled && (
                      <div className="mt-4">
                        <VariationBuilder
                          parameterSchema={selectedTemplate.parameterSchema}
                          baseParameters={parameters}
                          variations={variations}
                          onVariationsChange={setVariations}
                        />
                      </div>
                    )}
                  </div>

                  {/* Step 5: Assignment strategy (BRET batch only) */}
                  {selectedTemplateId === 'bret' &&
                    batchModeEnabled &&
                    variations.length > 0 &&
                    variations.every((v) => v.values.length > 0) && (
                      <>
                        <div className="divider"></div>
                        <div>
                          <h3 className="font-semibold text-lg mb-4">5. Participant Assignment Strategy</h3>
                          <div className="space-y-3">
                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-base-300 rounded-lg hover:bg-base-200">
                              <input
                                type="radio"
                                name="assignmentStrategy"
                                className="radio radio-primary mt-1"
                                checked={assignmentStrategy === 'round_robin'}
                                onChange={() => setAssignmentStrategy('round_robin')}
                              />
                              <div>
                                <div className="font-medium">Round Robin (Recommended)</div>
                                <div className="text-sm text-base-content/70">Distribute participants evenly across all variations</div>
                              </div>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-base-300 rounded-lg hover:bg-base-200">
                              <input
                                type="radio"
                                name="assignmentStrategy"
                                className="radio radio-primary mt-1"
                                checked={assignmentStrategy === 'fill_sequential'}
                                onChange={() => setAssignmentStrategy('fill_sequential')}
                              />
                              <div>
                                <div className="font-medium">Fill Sequential</div>
                                <div className="text-sm text-base-content/70">
                                  Fill each variation to capacity before moving to the next.
                                </div>
                              </div>
                            </label>
                          </div>
                          <div className="form-control mt-4">
                            <label className="label">
                              <span className="label-text font-medium">Max participants per variation (optional)</span>
                            </label>
                            <input
                              type="number"
                              className="input input-bordered w-48"
                              placeholder="No limit"
                              min={1}
                              value={maxPerVariation}
                              onChange={(e) => setMaxPerVariation(e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}
                </>
              )}
            </div>

            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            <div className="card-actions justify-end mt-6">
              <button
                className="btn btn-primary"
                onClick={() => void handleCreateExperiment()}
                disabled={creating || !experimentName.trim()}
              >
                {creating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0) ? (
                  `Create with ${variations.reduce((acc, v) => acc * v.values.length, 1)} Variations`
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
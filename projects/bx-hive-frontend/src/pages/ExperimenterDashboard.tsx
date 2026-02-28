import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
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
import { useTrustVariation, STATUS_COMPLETED, type VariationConfig } from '../hooks/useTrustVariation'
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

/** Max escrow in ALGO for one variation given its params and max subjects */
function computeEscrowAlgo(params: Record<string, number | string>, maxSubjects: number): number {
  const e1 = Number(params.E1) || 0
  const m = Number(params.m) || 1
  const e2 = Number(params.E2) || 0
  const numPairs = Math.floor(maxSubjects / 2)
  return (e1 * m + e2) * numPairs
}

/** Convert trust-game frontend params (ALGO) to contract args (microAlgo) */
function toVariationParams(params: Record<string, number | string>, label: string, maxSubjects = 0, escrowAlgo = 0) {
  return {
    label,
    e1: BigInt(Math.round(Number(params.E1) * 1_000_000)),
    e2: BigInt(Math.round(Number(params.E2) * 1_000_000)),
    multiplier: BigInt(Math.round(Number(params.m))),
    unit: BigInt(Math.round(Number(params.UNIT) * 1_000_000)),
    assetId: 0n,
    maxSubjects: BigInt(maxSubjects),
    escrowMicroAlgo: BigInt(Math.round(escrowAlgo * 1_000_000)),
  }
}

export default function ExperimenterDashboard() {
  const { activeUser } = useActiveUser()
  const { algorand, activeAddress } = useAlgorand()
  const { createExperimentWithVariation, createVariation, listExperiments, listVariations } = useTrustExperiments()
  const { addSubjects, getSubjectCount, getConfig, endVariation } = useTrustVariation()

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

  // Variation configs (status, etc) per variation appId as string
  const [variationConfigs, setVariationConfigs] = useState<Record<string, VariationConfig>>({})

  // End variation (per variation appId as string)
  const [endingVariation, setEndingVariation] = useState<Record<string, boolean>>({})
  const [endVariationErrors, setEndVariationErrors] = useState<Record<string, string>>({})

  // Subject counts per variation (appId string → count)
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({})

  // Wallet balance in ALGO (null = not yet loaded)
  const [walletBalanceAlgo, setWalletBalanceAlgo] = useState<number | null>(null)

  // Expanded variation panels
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(new Set())

  const selectedTemplate = getTemplateById(selectedTemplateId)

  useEffect(() => {
    if (activeUser) {
      void loadAll()
    }
  }, [activeUser])

  useEffect(() => {
    if (!algorand || !activeAddress) {
      setWalletBalanceAlgo(null)
      return
    }
    void algorand.account.getInformation(activeAddress).then((info) => {
      setWalletBalanceAlgo(Number(info.balance.microAlgo) / 1_000_000)
    })
  }, [algorand, activeAddress])

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
      const valid = withVariations.filter(({ group }) => {
        if (Number(group.variationCount) === 0) {
          console.warn(`[bx-hive] Orphaned experiment exp_id=${group.expId} name="${group.name}" has 0 variations — hiding from UI`)
          return false
        }
        return true
      })
      setOnChainExps(valid)

      // Load subject counts and variation configs for all variations
      const counts: Record<string, number> = {}
      const configs: Record<string, VariationConfig> = {}
      await Promise.all(
        valid.flatMap(({ variations: vars }) =>
          vars.map(async (v) => {
            const key = String(v.appId)
            try {
              counts[key] = await getSubjectCount(v.appId)
            } catch {
              counts[key] = 0
            }
            try {
              configs[key] = await getConfig(v.appId)
            } catch {
              // config unavailable — leave undefined
            }
          }),
        ),
      )
      setSubjectCounts(counts)
      setVariationConfigs(configs)
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
    if (selectedTemplateId === 'trust-game' && (!maxPerVariation || Number(maxPerVariation) < 2)) {
      setError('Max participants per variation must be at least 2 for trust game experiments')
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
    const maxSub = Number(maxPerVariation)
    if (batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)) {
      const combos = generateVariationCombinations(parameters, variations)
      // First combo: atomic combined call (experiment always has ≥1 variation)
      const { expId } = await createExperimentWithVariation(
        experimentName.trim(),
        toVariationParams(combos[0], getVariationLabel(combos[0], variations), maxSub, computeEscrowAlgo(combos[0], maxSub)),
      )
      // Remaining combos: add variations to the existing experiment
      for (let i = 1; i < combos.length; i++) {
        await createVariation(expId, toVariationParams(combos[i], getVariationLabel(combos[i], variations), maxSub, computeEscrowAlgo(combos[i], maxSub)))
      }
    } else {
      await createExperimentWithVariation(
        experimentName.trim(),
        toVariationParams(parameters, 'Default', maxSub, computeEscrowAlgo(parameters, maxSub)),
      )
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

  async function handleEndVariation(appId: bigint) {
    const key = String(appId)
    setEndingVariation((prev) => ({ ...prev, [key]: true }))
    setEndVariationErrors((prev) => ({ ...prev, [key]: '' }))
    try {
      await endVariation(appId)
      await loadOnChainExperiments()
    } catch (err) {
      setEndVariationErrors((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'Failed to end variation' }))
    } finally {
      setEndingVariation((prev) => ({ ...prev, [key]: false }))
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

  // Compute total escrow needed for the create button guard
  const totalEscrowAlgo = (() => {
    if (selectedTemplateId !== 'trust-game' || !maxPerVariation || Number(maxPerVariation) < 2) return 0
    const maxSub = Number(maxPerVariation)
    const combos =
      batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)
        ? generateVariationCombinations(parameters, variations)
        : [parameters]
    return combos.reduce((sum, combo) => sum + computeEscrowAlgo(combo, maxSub), 0)
  })()

  const insufficientBalance =
    selectedTemplateId === 'trust-game' &&
    walletBalanceAlgo !== null &&
    totalEscrowAlgo > 0 &&
    totalEscrowAlgo > walletBalanceAlgo

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
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/experimenter/trust/${group.expId}`}
                          className="btn btn-sm btn-ghost"
                        >
                          View Details
                        </Link>
                        <span className="badge badge-primary">TRUST</span>
                      </div>
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
                                <span className="badge badge-sm badge-ghost ml-2">{subjectCounts[appIdKey] ?? 0} subjects</span>
                              </div>
                              <span className="text-base-content/50">{isExpanded ? '▲' : '▼'}</span>
                            </button>

                            {/* Management panel */}
                            {isExpanded && (
                              <div className="p-3 pt-0 space-y-4 border-t border-base-300">

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

                                {/* End Variation */}
                                {variationConfigs[appIdKey]?.status !== STATUS_COMPLETED && (
                                  <div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-warning"
                                      onClick={() => void handleEndVariation(v.appId)}
                                      disabled={endingVariation[appIdKey]}
                                    >
                                      {endingVariation[appIdKey] ? <span className="loading loading-spinner loading-xs"></span> : 'End Variation & Withdraw Remaining'}
                                    </button>
                                    {endVariationErrors[appIdKey] && (
                                      <p className="text-error text-xs mt-1">{endVariationErrors[appIdKey]}</p>
                                    )}
                                  </div>
                                )}
                                {variationConfigs[appIdKey]?.status === STATUS_COMPLETED && (
                                  <div className="badge badge-ghost badge-sm">Variation ended</div>
                                )}
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
                      className={`card bg-base-100 border-2 transition-all ${
                        template.disabled
                          ? 'opacity-40 cursor-not-allowed border-base-300'
                          : selectedTemplateId === template.id
                            ? 'cursor-pointer border-primary shadow-lg'
                            : 'cursor-pointer border-base-300 hover:border-base-400'
                      }`}
                      onClick={() => !template.disabled && setSelectedTemplateId(template.id)}
                    >
                      <div className="card-body">
                        <div className="flex justify-between items-start">
                          <h4 className="card-title text-lg">{template.name}</h4>
                          <div className="flex gap-1">
                            {template.disabled && <span className="badge badge-ghost badge-sm">coming soon</span>}
                            <span className="badge badge-neutral badge-sm">{template.playerCount}-player</span>
                          </div>
                        </div>
                        <p className="text-sm text-base-content/70">{template.description}</p>
                        {selectedTemplateId === template.id && (
                          <div className="flex gap-2 mt-2">
                            <span className="badge badge-primary">Selected</span>
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

                  {/* Step 5: Participants — always shown for trust-game; batch-only for BRET */}
                  {(selectedTemplateId === 'trust-game' ||
                    (batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0))) && (
                    <>
                      <div className="divider"></div>
                      <div>
                        <h3 className="font-semibold text-lg mb-4">5. Participants</h3>

                        {/* Assignment strategy radios — BRET only */}
                        {selectedTemplateId === 'bret' && batchModeEnabled && (
                          <div className="space-y-3 mb-4">
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
                                <div className="text-sm text-base-content/70">Fill each variation to capacity before moving to the next.</div>
                              </div>
                            </label>
                          </div>
                        )}

                        {/* Trust Game info */}
                        {selectedTemplateId === 'trust-game' && (
                          <div className="alert alert-info mb-4">
                            <span>Subjects self-enroll and are automatically distributed across variations using round robin.</span>
                          </div>
                        )}

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">
                              Max participants per variation{selectedTemplateId === 'trust-game' ? ' (required)' : ' (optional)'}
                            </span>
                          </label>
                          <input
                            type="number"
                            className="input input-bordered w-48"
                            placeholder={selectedTemplateId === 'trust-game' ? 'e.g. 20' : 'No limit'}
                            min={selectedTemplateId === 'trust-game' ? 2 : 1}
                            value={maxPerVariation}
                            onChange={(e) => setMaxPerVariation(e.target.value)}
                          />
                        </div>

                        {/* Funding Summary — trust-game only */}
                        {selectedTemplateId === 'trust-game' && maxPerVariation && Number(maxPerVariation) >= 2 && (() => {
                          const maxSub = Number(maxPerVariation)
                          const combos = batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)
                            ? generateVariationCombinations(parameters, variations)
                            : [parameters]
                          const rows = combos.map((combo, i) => ({
                            label: batchModeEnabled ? getVariationLabel(combo, variations) : 'Default',
                            escrow: computeEscrowAlgo(combo, maxSub),
                            index: i,
                          }))
                          const total = rows.reduce((sum, r) => sum + r.escrow, 0)
                          return (
                            <>
                              <div className="divider"></div>
                              <div>
                                <h4 className="font-semibold mb-3">Funding Summary</h4>
                                <div className="overflow-x-auto">
                                  <table className="table table-sm w-full">
                                    <thead>
                                      <tr>
                                        <th>Variation</th>
                                        <th className="text-right">Max Escrow (ALGO)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row) => (
                                        <tr key={row.index}>
                                          <td>{row.label}</td>
                                          <td className="text-right">{row.escrow}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="font-bold">
                                        <td>Total Required</td>
                                        <td className="text-right">{total} ALGO</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                                {walletBalanceAlgo !== null && total > walletBalanceAlgo ? (
                                  <div className="alert alert-error mt-3">
                                    <span className="text-sm">
                                      Insufficient balance. You need <strong>{total} ALGO</strong> but your wallet only has{' '}
                                      <strong>{walletBalanceAlgo.toFixed(2)} ALGO</strong>. Add funds before creating this experiment.
                                    </span>
                                  </div>
                                ) : (
                                  <div className="alert alert-info mt-3">
                                    <span className="text-sm">
                                      Your wallet will be charged <strong>{total} ALGO</strong> at creation to pre-fund all variations.
                                      Leftover funds are returned automatically when you end each variation.
                                    </span>
                                  </div>
                                )}
                              </div>
                            </>
                          )
                        })()}
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
                disabled={creating || !experimentName.trim() || insufficientBalance}
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
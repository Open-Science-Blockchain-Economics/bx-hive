import { useEffect, useState } from 'react'
import { createExperiment as dbCreateExperiment, createExperimentBatch, getVariationLabel } from '../../db'
import { experimentTemplates, getTemplateById } from '../../experiment-logic/templates'
import type { AssignmentStrategy, ParameterVariation } from '../../types'
import { computeEscrowAlgo, generateVariationCombinations, toVariationParams } from '../../utils/trustGameCalc'
import FundingSummary from './FundingSummary'
import TemplateSelector from './TemplateSelector'
import { VariationBuilder } from './VariationBuilder'

interface CreateExperimentFormProps {
  activeUserId: string
  walletBalanceAlgo: number | null
  createExperimentWithVariation: (name: string, params: ReturnType<typeof toVariationParams>) => Promise<{ expId: number }>
  createVariation: (expId: number, params: ReturnType<typeof toVariationParams>) => Promise<bigint>
  onCreated: () => void
}

export default function CreateExperimentForm({
  activeUserId,
  walletBalanceAlgo,
  createExperimentWithVariation,
  createVariation,
  onCreated,
}: CreateExperimentFormProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(experimentTemplates[0]?.id || '')
  const [experimentName, setExperimentName] = useState('')
  const [parameters, setParameters] = useState<Record<string, number | string>>({})
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [batchModeEnabled, setBatchModeEnabled] = useState(false)
  const [variations, setVariations] = useState<ParameterVariation[]>([])
  const [assignmentStrategy, setAssignmentStrategy] = useState<AssignmentStrategy>('round_robin')
  const [maxPerVariation, setMaxPerVariation] = useState<string>('')

  const selectedTemplate = getTemplateById(selectedTemplateId)

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
    if (!selectedTemplate) return

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
      onCreated()
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
      const { expId } = await createExperimentWithVariation(
        experimentName.trim(),
        toVariationParams(combos[0], getVariationLabel(combos[0], variations), maxSub, computeEscrowAlgo(combos[0], maxSub)),
      )
      for (let i = 1; i < combos.length; i++) {
        await createVariation(
          expId,
          toVariationParams(combos[i], getVariationLabel(combos[i], variations), maxSub, computeEscrowAlgo(combos[i], maxSub)),
        )
      }
    } else {
      await createExperimentWithVariation(
        experimentName.trim(),
        toVariationParams(parameters, 'Default', maxSub, computeEscrowAlgo(parameters, maxSub)),
      )
    }
  }

  async function createBretLocal() {
    if (batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)) {
      await createExperimentBatch(
        selectedTemplateId,
        activeUserId,
        experimentName.trim(),
        parameters,
        variations,
        assignmentStrategy,
        maxPerVariation ? Number(maxPerVariation) : undefined,
      )
    } else {
      await dbCreateExperiment(selectedTemplateId, activeUserId, experimentName.trim(), parameters)
    }
  }

  const maxPayout =
    selectedTemplateId === 'trust-game' ? (Number(parameters.E1) || 0) * (Number(parameters.m) || 1) + (Number(parameters.E2) || 0) : null

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
    selectedTemplateId === 'trust-game' && walletBalanceAlgo !== null && totalEscrowAlgo > 0 && totalEscrowAlgo > walletBalanceAlgo

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">Create New Experiment</h2>

        <div className="space-y-3">
          {/* Step 1: Template Selection */}
          <div>
            <h3 className="font-semibold text-lg mb-2">1. Select Template</h3>
            <TemplateSelector templates={experimentTemplates} selectedTemplateId={selectedTemplateId} onSelect={setSelectedTemplateId} />
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
                        (E1 &times; m) + E2 = ({parameters.E1} &times; {parameters.m}) + {parameters.E2}
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

              {/* Step 5: Participants */}
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
                          Max participants per variation
                          {selectedTemplateId === 'trust-game' ? ' (required)' : ' (optional)'}
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
                    {selectedTemplateId === 'trust-game' && (
                      <FundingSummary
                        parameters={parameters}
                        variations={variations}
                        batchModeEnabled={batchModeEnabled}
                        maxPerVariation={maxPerVariation}
                        walletBalanceAlgo={walletBalanceAlgo}
                      />
                    )}
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
  )
}

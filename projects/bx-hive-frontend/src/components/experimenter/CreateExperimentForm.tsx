import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

const DOCS_BASE_URL = 'https://open-science-blockchain-economics.github.io/bx-hive'

const DOCS_LINKS = {
  participants: `${DOCS_BASE_URL}/subjects/joining-experiments/#auto-assignment-to-variations`,
  maxPayout: `${DOCS_BASE_URL}/concepts/payout-calculations/`,
} as const
import { createExperiment as dbCreateExperiment, createExperimentBatch, getVariationLabel } from '../../db'
import { experimentTemplates, getTemplateById } from '../../experiment-logic/templates'
import type { AssignmentStrategy, ParameterVariation } from '../../types'
import { computeEscrowAlgo, generateVariationCombinations, toVariationParams } from '../../utils/trustGameCalc'
import InfoAlert from '../ui/InfoAlert'
import FundingSummary from './FundingSummary'
import TemplateSelector from './TemplateSelector'
import TrustGameParameters from './TrustGameParameters'
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

  function resetForm() {
    setExperimentName('')
    setBatchModeEnabled(false)
    setVariations([])
    setMaxPerVariation('')
  }

  const trustMutation = useMutation({
    mutationFn: async () => {
      const maxSub = Number(maxPerVariation) * 2
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
    },
    onSuccess: () => {
      resetForm()
      onCreated()
    },
  })

  const bretMutation = useMutation({
    mutationFn: async () => {
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
    },
    onSuccess: () => {
      resetForm()
      onCreated()
    },
  })

  const creating = trustMutation.isPending || bretMutation.isPending
  const error = (trustMutation.error ?? bretMutation.error)?.message ?? null

  function handleCreateExperiment() {
    if (!experimentName.trim()) {
      trustMutation.reset()
      bretMutation.reset()
      return
    }
    if (selectedTemplateId === 'trust-game' && (!maxPerVariation || Number(maxPerVariation) < 1)) return
    if (!selectedTemplate) return

    if (selectedTemplateId === 'trust-game') {
      trustMutation.mutate()
    } else {
      bretMutation.mutate()
    }
  }

  // Validation errors shown inline (not from mutation)
  const validationError = !experimentName.trim()
    ? 'Experiment name is required'
    : selectedTemplateId === 'trust-game' && (!maxPerVariation || Number(maxPerVariation) < 1)
      ? 'Max matches per variation must be at least 1 for trust game experiments'
      : null

  const maxPayout =
    selectedTemplateId === 'trust-game' ? (Number(parameters.E1) || 0) * (Number(parameters.m) || 1) + (Number(parameters.E2) || 0) : null

  const totalEscrowAlgo = (() => {
    if (selectedTemplateId !== 'trust-game' || !maxPerVariation || Number(maxPerVariation) < 1) return 0
    const maxSub = Number(maxPerVariation) * 2
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
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Experiment Name</legend>
              <input
                type="text"
                className="input input-bordered w-full"
                value={experimentName}
                onChange={(e) => setExperimentName(e.target.value)}
                placeholder="e.g., Trust Experiment – Spring 2025"
              />
            </fieldset>
          </div>

          {/* Step 3: Parameters */}
          {selectedTemplate && (
            <>
              <div className="divider"></div>
              <div>
                <h3 className="font-semibold text-lg mb-2">3. Configure Base Parameters</h3>
                {selectedTemplateId === 'trust-game' ? (
                  <TrustGameParameters parameters={parameters} onChange={handleParameterChange} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTemplate.parameterSchema.map((param) => (
                      <fieldset key={param.name} className="fieldset">
                        <legend className="fieldset-legend">{param.label}</legend>
                        <input
                          type={param.type === 'number' ? 'number' : 'text'}
                          className="input input-bordered w-full"
                          value={parameters[param.name] ?? ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value, param.type)}
                          min={param.min}
                          max={param.max}
                        />
                        {param.description && <p className="fieldset-label text-base-content/60">{param.description}</p>}
                      </fieldset>
                    ))}
                  </div>
                )}

                {maxPayout !== null && !batchModeEnabled && (
                  <InfoAlert learnMoreHref={DOCS_LINKS.maxPayout} className="mt-4">
                    Max Payout Per Pair: <strong>{maxPayout} ALGO</strong>
                  </InfoAlert>
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
                      <InfoAlert learnMoreHref={DOCS_LINKS.participants} className="mb-4">
                        Subjects self-enroll and are distributed across variations using round robin
                      </InfoAlert>
                    )}

                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">
                        Max matches per variation
                        {selectedTemplateId === 'trust-game' ? ' (required)' : ' (optional)'}
                      </legend>
                      <input
                        type="number"
                        className="input input-bordered w-full sm:w-48"
                        placeholder={selectedTemplateId === 'trust-game' ? 'e.g. 10' : 'No limit'}
                        min={selectedTemplateId === 'trust-game' ? 1 : 1}
                        value={maxPerVariation}
                        onChange={(e) => setMaxPerVariation(e.target.value)}
                      />
                    </fieldset>

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

        {(error ?? validationError) && (
          <div className="alert alert-error mt-4">
            <span>{error ?? validationError}</span>
          </div>
        )}

        <div className="card-actions justify-end mt-6">
          <button
            className="btn btn-primary"
            onClick={handleCreateExperiment}
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

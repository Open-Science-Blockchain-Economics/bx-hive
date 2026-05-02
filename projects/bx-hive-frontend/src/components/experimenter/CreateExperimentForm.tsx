import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Field } from '@/components/ds/field'
import { Input } from '@/components/ds/input'
import { Rule } from '@/components/ds/separator'
import { Switch } from '@/components/ds/switch'
import { getVariationLabel } from '../../db'
import { experimentTemplates, getTemplateById } from '../../experiment-logic/templates'
import type { ParameterVariation } from '../../types'
import { computeEscrowAlgo, generateVariationCombinations, toVariationParams } from '../../utils/trustGameCalc'
import InfoAlert from '../ui/InfoAlert'
import FundingSummary from './FundingSummary'
import TemplateSelector from './TemplateSelector'
import TrustGameParameters from './TrustGameParameters'
import { VariationBuilder } from './VariationBuilder'

const DOCS_BASE_URL = 'https://open-science-blockchain-economics.github.io/bx-hive'

const DOCS_LINKS = {
  participants: `${DOCS_BASE_URL}/subjects/joining-experiments/#auto-assignment-to-variations`,
  maxPayout: `${DOCS_BASE_URL}/concepts/payout-calculations/`,
} as const

interface CreateExperimentFormProps {
  walletBalanceAlgo: number | null
  createExperimentWithVariation: (name: string, params: ReturnType<typeof toVariationParams>) => Promise<{ expId: number }>
  createVariation: (expId: number, params: ReturnType<typeof toVariationParams>) => Promise<bigint>
  onCreated: () => void
}

export default function CreateExperimentForm({
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
    setParameters((prev) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
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

  const creating = trustMutation.isPending
  const error = trustMutation.error?.message ?? null

  function handleCreate() {
    if (!experimentName.trim()) {
      trustMutation.reset()
      return
    }
    if (!maxPerVariation || Number(maxPerVariation) < 1) return
    if (!selectedTemplate) return
    trustMutation.mutate()
  }

  const validationError = !experimentName.trim()
    ? 'Experiment name is required'
    : !maxPerVariation || Number(maxPerVariation) < 1
      ? 'Max matches per variation must be at least 1'
      : null

  const maxPayout = (Number(parameters.E1) || 0) * (Number(parameters.m) || 1) + (Number(parameters.E2) || 0)

  const totalEscrowAlgo = (() => {
    if (!maxPerVariation || Number(maxPerVariation) < 1) return 0
    const maxSub = Number(maxPerVariation) * 2
    const combos =
      batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)
        ? generateVariationCombinations(parameters, variations)
        : [parameters]
    return combos.reduce((sum, combo) => sum + computeEscrowAlgo(combo, maxSub), 0)
  })()

  const insufficientBalance = walletBalanceAlgo !== null && totalEscrowAlgo > 0 && totalEscrowAlgo > walletBalanceAlgo
  const hasBatch = batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)
  const submitLabel = hasBatch ? `Create with ${variations.reduce((acc, v) => acc * v.values.length, 1)} variations` : 'Create experiment'

  return (
    <div className="flex flex-col gap-6">
      <h2 className="t-h1">Create New Experiment</h2>

      {/* Step 1: Template */}
      <section>
        <Rule label="1. Select Template" className="mb-4" />
        <TemplateSelector templates={experimentTemplates} selectedTemplateId={selectedTemplateId} onSelect={setSelectedTemplateId} />
      </section>

      {/* Step 2: Name */}
      <section>
        <Rule label="2. Experiment Details" className="mb-4" />
        <Field label="Experiment Name" htmlFor="experiment-name" required>
          <Input
            id="experiment-name"
            type="text"
            value={experimentName}
            onChange={(e) => setExperimentName(e.target.value)}
            placeholder="e.g., Trust Experiment – Spring 2025"
          />
        </Field>
      </section>

      {selectedTemplate && (
        <>
          {/* Step 3: Parameters */}
          <section>
            <Rule label="3. Configure Base Parameters" className="mb-4" />
            <TrustGameParameters parameters={parameters} onChange={handleParameterChange} />
            {!batchModeEnabled && (
              <InfoAlert learnMoreHref={DOCS_LINKS.maxPayout} className="mt-4">
                Max Payout Per Pair: <strong>{maxPayout} ALGO</strong>
              </InfoAlert>
            )}
          </section>

          {/* Step 4: Variations */}
          <section>
            <Rule label="4. Parameter Variations (Optional)" className="mb-4" />
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <Switch
                checked={batchModeEnabled}
                onCheckedChange={(checked) => {
                  setBatchModeEnabled(checked)
                  if (!checked) setVariations([])
                }}
              />
              <span className="text-sm">Enable batch mode — create multiple variations</span>
            </label>
            {batchModeEnabled && (
              <VariationBuilder
                parameterSchema={selectedTemplate.parameterSchema}
                baseParameters={parameters}
                variations={variations}
                onVariationsChange={setVariations}
              />
            )}
          </section>

          {/* Step 5: Participants */}
          <section>
            <Rule label="5. Participants" className="mb-4" />
            <InfoAlert learnMoreHref={DOCS_LINKS.participants} className="mb-4">
              Subjects self-enroll and are distributed across variations using round robin
            </InfoAlert>
            <Field label="Max matches per variation" hint="required" htmlFor="max-per-variation" required className="w-full sm:w-48">
              <Input
                id="max-per-variation"
                mono
                type="number"
                placeholder="e.g. 10"
                min={1}
                value={maxPerVariation}
                onChange={(e) => setMaxPerVariation(e.target.value)}
              />
            </Field>
            <FundingSummary
              parameters={parameters}
              variations={variations}
              batchModeEnabled={batchModeEnabled}
              maxPerVariation={maxPerVariation}
              walletBalanceAlgo={walletBalanceAlgo}
            />
          </section>
        </>
      )}

      {(error ?? validationError) && (
        <div role="alert" className="rounded-sm border border-neg/35 bg-neg-bg text-neg px-3 py-2.5 text-sm">
          {error ?? validationError}
        </div>
      )}

      <div className="flex justify-end">
        <Btn variant="primary" onClick={handleCreate} disabled={creating || !experimentName.trim() || insufficientBalance}>
          {creating ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Creating…
            </>
          ) : (
            submitLabel
          )}
        </Btn>
      </div>
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Field } from '@/components/ds/field'
import { Input } from '@/components/ds/input'
import { Switch } from '@/components/ds/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import { cn } from '@/lib/utils'
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
  participants: `${DOCS_BASE_URL}/participants/joining-experiments/#auto-assignment-to-variations`,
  maxPayout: `${DOCS_BASE_URL}/concepts/payout-calculations/`,
} as const

type StepState = 'done' | 'active' | 'pending'

interface StepProps {
  n: number
  title: string
  state: StepState
  isLast?: boolean
  children: ReactNode
}

function Step({ n, title, state, isLast = false, children }: StepProps) {
  return (
    <div className="grid grid-cols-[40px_1fr] sm:grid-cols-[60px_1fr] gap-4 sm:gap-6">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'size-8 rounded-pill grid place-items-center font-mono text-xs font-semibold border shrink-0',
            state === 'done' && 'border-primary bg-primary text-primary-foreground',
            state === 'active' && 'border-primary text-primary',
            state === 'pending' && 'border-rule-2 text-muted-foreground',
          )}
        >
          {state === 'done' ? <Check className="size-4" /> : n}
        </div>
        {!isLast && <div className="flex-1 w-px bg-border mt-2" />}
      </div>
      <div className={cn('pb-9', isLast && 'pb-0')}>
        <h3
          className={cn(
            'font-display text-2xl font-normal leading-tight',
            state === 'pending' ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {title}
        </h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

function PayoffPreview({ e1, m }: { e1: number; m: number }) {
  const sent = e1 || 0
  const multiplied = sent * (m || 1)
  return (
    <div className="rounded-sm border border-dashed border-rule-2 bg-muted px-4 py-3">
      <div className="t-micro mb-2">Payoff preview · max send</div>
      <div className="flex items-center gap-2 flex-wrap font-mono text-xs sm:text-sm text-ink-2">
        <span>Investor sends</span>
        <span className="text-primary font-medium">{sent}</span>
        <span className="text-faint">→</span>
        <span>Multiplied ×{m || 1}</span>
        <span className="text-faint">→</span>
        <span className="text-primary font-medium">{multiplied}</span>
        <span className="text-faint">→</span>
        <span>Trustee returns r</span>
        <span className="text-faint">→</span>
        <span>
          Investor: <span className="text-foreground">r</span>
          {' · '}
          Trustee: <span className="text-foreground">{multiplied}−r</span>
        </span>
      </div>
    </div>
  )
}

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
  const variationCount = hasBatch ? variations.reduce((acc, v) => acc * v.values.length, 1) : 1
  const submitLabel = hasBatch ? `Deploy with ${variationCount} variations` : 'Deploy experiment'

  // Step state machine
  const step1Done = !!selectedTemplate && !selectedTemplate.disabled
  const step2Done = !!experimentName.trim()
  const step3Done = step2Done && !!maxPerVariation && Number(maxPerVariation) >= 1
  const step4Done = step3Done && (!batchModeEnabled || hasBatch)
  const stepsDone = [step1Done, step2Done, step3Done, step4Done]
  const activeIdx = stepsDone.findIndex((d) => !d)
  const stateForStep = (idx: number): StepState => {
    if (stepsDone[idx]) return 'done'
    if (activeIdx === idx) return 'active'
    return 'pending'
  }
  const reviewState: StepState = step4Done ? 'active' : 'pending'

  return (
    <div>
      <div className="mb-9">
        <div className="flex items-center gap-3 mb-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/dashboard/experimenter"
                aria-label="Back to Experimenter Dashboard"
                className="inline-flex items-center justify-center size-8 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Back to Experimenter Dashboard</TooltipContent>
          </Tooltip>
          <h1 className="t-h1">Specify a new experiment</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-11">Pin parameters now; you can add variations once the base case is locked.</p>
      </div>

      <Step n={1} title="Choose a template" state={stateForStep(0)}>
        <TemplateSelector templates={experimentTemplates} selectedTemplateId={selectedTemplateId} onSelect={setSelectedTemplateId} />
      </Step>

      <Step n={2} title="Identify the experiment" state={stateForStep(1)}>
        <div className="max-w-xl">
          <Field label="Experiment Name" htmlFor="experiment-name" required>
            <Input
              id="experiment-name"
              type="text"
              value={experimentName}
              onChange={(e) => setExperimentName(e.target.value)}
              placeholder="e.g., Trust Experiment – Spring 2025"
            />
          </Field>
        </div>
      </Step>

      {selectedTemplate && (
        <>
          <Step n={3} title="Configure base parameters" state={stateForStep(2)}>
            <TrustGameParameters parameters={parameters} onChange={handleParameterChange} />
            <div className="mt-5 max-w-xs">
              <Field label="Participants target" hint="max matches per variation" htmlFor="max-per-variation" required>
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
            </div>
            <div className="mt-5">
              <PayoffPreview e1={Number(parameters.E1) || 0} m={Number(parameters.m) || 1} />
            </div>
            {!batchModeEnabled && (
              <InfoAlert learnMoreHref={DOCS_LINKS.maxPayout} className="mt-4">
                Max payout per pair: <strong>{maxPayout} ALGO</strong>
              </InfoAlert>
            )}
          </Step>

          <Step n={4} title="Variations" state={stateForStep(3)}>
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
            {batchModeEnabled ? (
              <VariationBuilder
                parameterSchema={selectedTemplate.parameterSchema}
                baseParameters={parameters}
                variations={variations}
                onVariationsChange={setVariations}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Single variation will be deployed with the base parameters above. Toggle batch mode to deploy multiple variations.
              </p>
            )}
          </Step>

          <Step n={5} title="Review &amp; deploy" state={reviewState} isLast>
            <InfoAlert learnMoreHref={DOCS_LINKS.participants} className="mb-4">
              Participants self-enroll and are distributed across variations using round robin.
            </InfoAlert>
            <FundingSummary
              parameters={parameters}
              variations={variations}
              batchModeEnabled={batchModeEnabled}
              maxPerVariation={maxPerVariation}
              walletBalanceAlgo={walletBalanceAlgo}
            />
            {(error ?? validationError) && (
              <div role="alert" className="mt-4 rounded-sm border border-neg/35 bg-neg-bg text-neg px-3 py-2.5 text-sm">
                {error ?? validationError}
              </div>
            )}
            <div className="flex justify-end mt-5">
              <Btn variant="primary" onClick={handleCreate} disabled={creating || !experimentName.trim() || insufficientBalance}>
                {creating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Deploying…
                  </>
                ) : (
                  submitLabel
                )}
              </Btn>
            </div>
          </Step>
        </>
      )}
    </div>
  )
}

import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import type { VariationConfig } from '../../../hooks/useTrustVariation'
import { microAlgoToAlgo } from '../../../utils/amount'
import { loraApplicationUrl } from '../../../utils/lora'

interface VariationConfigCardProps {
  config: VariationConfig | undefined
  appId: bigint
  subjectCount: number
}

function LoraLink({ appId }: { appId: bigint }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={loraApplicationUrl('localnet', appId)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View app #${String(appId)} on Lora`}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="size-4" />
        </a>
      </TooltipTrigger>
      <TooltipContent side="right">View app #{String(appId)} on Lora</TooltipContent>
    </Tooltip>
  )
}

interface MetricProps {
  label: string
  value: string
  unit: ReactNode
}

function Metric({ label, value, unit }: MetricProps) {
  return (
    <div className="px-3 py-1">
      <div className="t-micro mb-1">{label}</div>
      <div className="text-base font-semibold font-mono">{value}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
    </div>
  )
}

function CapacityBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-1 h-1 w-full rounded-full bg-(--rule) overflow-hidden"
    >
      <div
        className="h-full bg-(--brand) motion-safe:transition-[width] motion-safe:duration-250"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

function CapacityUnit({ subjectCount, maxSubjects }: { subjectCount: number; maxSubjects: bigint }) {
  if (maxSubjects === 0n) return <>unlimited</>
  const max = Number(maxSubjects)
  const pct = max > 0 ? (subjectCount / max) * 100 : 0
  return (
    <>
      <span>{`${Math.round(pct)}%`}</span>
      <CapacityBar pct={pct} />
    </>
  )
}

export default function VariationConfigCard({ config, appId, subjectCount }: VariationConfigCardProps) {
  if (!config) {
    return (
      <div className="flex items-center gap-2">
        <h3 className="t-micro">Parameters</h3>
        <LoraLink appId={appId} />
      </div>
    )
  }

  const capacityValue =
    config.maxSubjects === 0n
      ? `${subjectCount} / ∞`
      : `${subjectCount} / ${String(config.maxSubjects)}`

  return (
    <div className="bg-muted rounded-sm p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="t-micro">Parameters</h3>
        <LoraLink appId={appId} />
      </div>
      <div className="overflow-x-auto">
        <div className="flex divide-x divide-border w-full">
          <Metric label="E1 Endowment" value={microAlgoToAlgo(config.e1).toFixed(3)} unit="ALGO" />
          <Metric label="E2 Endowment" value={microAlgoToAlgo(config.e2).toFixed(3)} unit="ALGO" />
          <Metric label="Multiplier" value={`×${String(config.multiplier)}`} unit="trust factor" />
          <Metric label="Unit Size" value={microAlgoToAlgo(config.unit).toFixed(3)} unit="ALGO" />
          <Metric
            label="Capacity"
            value={capacityValue}
            unit={<CapacityUnit subjectCount={subjectCount} maxSubjects={config.maxSubjects} />}
          />
        </div>
      </div>
    </div>
  )
}

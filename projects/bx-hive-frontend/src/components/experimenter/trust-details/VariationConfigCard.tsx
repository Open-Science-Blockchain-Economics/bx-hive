import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import { useAssetMetadata } from '../../../hooks/useAssetMetadata'
import type { VariationConfig } from '../../../hooks/useTrustVariation'
import { baseUnitsToWhole } from '../../../utils/amount'
import { loraApplicationUrl } from '../../../utils/lora'

interface VariationConfigCardProps {
  config: VariationConfig | undefined
  appId: bigint
  participantCount: number
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
      <div className="h-full bg-(--brand) motion-safe:transition-[width] motion-safe:duration-250" style={{ width: `${clamped}%` }} />
    </div>
  )
}

function CapacityUnit({ participantCount, maxParticipants }: { participantCount: number; maxParticipants: bigint }) {
  if (maxParticipants === 0n) return <>unlimited</>
  const max = Number(maxParticipants)
  const pct = max > 0 ? (participantCount / max) * 100 : 0
  return (
    <>
      <span>{`${Math.round(pct)}%`}</span>
      <CapacityBar pct={pct} />
    </>
  )
}

export default function VariationConfigCard({ config, appId, participantCount }: VariationConfigCardProps) {
  // Synthetic ALGO metadata is returned for assetId=0n, so this hook is safe
  // to call even when config hasn't loaded yet.
  const { decimals, unitName } = useAssetMetadata(config?.assetId ?? 0n)

  if (!config) {
    return (
      <div className="flex items-center gap-2">
        <h3 className="t-micro">Parameters</h3>
        <LoraLink appId={appId} />
      </div>
    )
  }

  const capacityValue =
    config.maxParticipants === 0n ? `${participantCount} / ∞` : `${participantCount} / ${String(config.maxParticipants)}`

  return (
    <div className="bg-muted rounded-sm p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="t-micro">Parameters</h3>
        <LoraLink appId={appId} />
      </div>
      <div className="overflow-x-auto">
        <div className="flex divide-x divide-border w-full">
          <Metric label="E1 Endowment" value={baseUnitsToWhole(config.e1, decimals).toFixed(3)} unit={unitName} />
          <Metric label="E2 Endowment" value={baseUnitsToWhole(config.e2, decimals).toFixed(3)} unit={unitName} />
          <Metric label="Multiplier" value={`×${String(config.multiplier)}`} unit="trust factor" />
          <Metric label="Unit Size" value={baseUnitsToWhole(config.unit, decimals).toFixed(3)} unit={unitName} />
          <Metric
            label="Capacity"
            value={capacityValue}
            unit={<CapacityUnit participantCount={participantCount} maxParticipants={config.maxParticipants} />}
          />
        </div>
      </div>
    </div>
  )
}

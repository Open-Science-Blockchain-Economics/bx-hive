import { ExternalLink } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import type { VariationConfig } from '../../../hooks/useTrustVariation'
import { microAlgoToAlgo } from '../../../utils/amount'
import { loraApplicationUrl } from '../../../utils/lora'

interface VariationConfigCardProps {
  config: VariationConfig | undefined
  appId: bigint
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
  unit: string
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

export default function VariationConfigCard({ config, appId }: VariationConfigCardProps) {
  if (!config) {
    return (
      <div className="flex items-center gap-2">
        <h3 className="t-micro">Parameters</h3>
        <LoraLink appId={appId} />
      </div>
    )
  }

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
        </div>
      </div>
    </div>
  )
}

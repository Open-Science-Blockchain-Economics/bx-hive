import { Bug } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import type { ExperimentGroup, VariationInfo } from '@/hooks/useTrustExperiments'
import { PHASE_COMPLETED, PHASE_TRUSTEE_DECISION } from '@/hooks/useTrustVariation'
import type { Match, VariationConfig } from '@/hooks/useTrustVariation'
import { statusLabel } from '@/utils/variationStatus'

export interface DebugInfoProps {
  group?: ExperimentGroup
  /** Variations the card covers: the routed one for a match, all of them for a joinable experiment. */
  variations?: VariationInfo[]
  /** Config of the routed variation — supplies the status label. */
  config?: VariationConfig
  match?: Match
  /** Variation app id for screens that hold no VariationInfo. */
  appId?: bigint
}

function formatExpId(id: number): string {
  return `EXP-${String(id).padStart(4, '0')}`
}

function phaseLabel(phase: number): string {
  if (phase === PHASE_COMPLETED) return 'Completed'
  if (phase === PHASE_TRUSTEE_DECISION) return 'Trustee deciding'
  return 'Investor deciding'
}

export function debugRows({ group, variations, config, match, appId }: DebugInfoProps): [string, string][] {
  const rows: [string, string][] = []
  if (group) {
    rows.push(['Experiment', formatExpId(group.expId)], ['Name', group.name])
  }
  for (const v of variations ?? []) {
    rows.push(['Variation', `${v.label} #${v.appId}`])
  }
  if (appId !== undefined) rows.push(['Variation app', `#${appId}`])
  if (config) rows.push(['Status', statusLabel(config)])
  if (match) {
    rows.push(['Match', `#${match.matchId}`], ['Phase', phaseLabel(match.phase)])
  }
  return rows
}

/** Ungated render path — mount this only through {@link DebugInfo} outside tests. */
export function DebugTooltip(props: DebugInfoProps) {
  const rows = debugRows(props)
  if (rows.length === 0) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Debug info"
          className="inline-flex items-center text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Bug className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="font-mono">
        <div className="grid gap-0.5">
          {rows.map(([label, value], i) => (
            <p key={`${label}-${i}`}>
              <span className="opacity-60">{label}: </span>
              {value}
            </p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Vite inlines `import.meta.env.MODE`, so this comparison folds to a constant at
 * build time and the tooltip is dropped from every bundle. MODE is 'development'
 * only for a plain `astro dev`; `--mode localnet-dev`/`localnet-prod` and all
 * builds set something else, and VITE_ENVIRONMENT can't tell them apart.
 */
export default function DebugInfo(props: DebugInfoProps) {
  if (import.meta.env.MODE !== 'development') return null
  return <DebugTooltip {...props} />
}

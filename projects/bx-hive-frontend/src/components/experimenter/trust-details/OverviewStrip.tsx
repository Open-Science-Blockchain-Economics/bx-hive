import { Pause, Play, RotateCcw } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Dot } from '@/components/ds/dot'
import { Gauge } from '@/components/ds/gauge'
import { Panel } from '@/components/ds/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import { StatCard } from '../../ui'
import type { VariationInfo } from '../../../hooks/useTrustExperiments'
import { PHASE_COMPLETED, STATUS_ACTIVE, STATUS_CLOSED, STATUS_COMPLETED } from '../../../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../../../hooks/useTrustVariation'

interface SubjectEntry {
  address: string
  enrolled: number
  assigned: number
}

interface OverviewStripProps {
  variations: VariationInfo[]
  subjects: Record<string, SubjectEntry[]>
  matches: Record<string, Match[]>
  configs: Record<string, VariationConfig>
  autoRefresh: boolean
  onToggleAutoRefresh: (val: boolean) => void
  onRefresh: () => void
  autoMatch: boolean
  onToggleAutoMatch: (val: boolean) => void
  autoMatchEligible: boolean
  autoMatchDisabledReason?: string
}

export default function OverviewStrip({
  variations,
  subjects,
  matches,
  configs,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
  autoMatch,
  onToggleAutoMatch,
  autoMatchEligible,
  autoMatchDisabledReason,
}: OverviewStripProps) {
  const allSubjects = Object.values(subjects).flat()
  const allMatches = Object.values(matches).flat()
  const totalEnrolled = allSubjects.length
  const totalWaiting = allSubjects.filter((s) => s.assigned === 0).length
  const totalAssigned = allSubjects.filter((s) => s.assigned === 1).length
  const totalMatches = allMatches.length
  const matchesInvestorPhase = allMatches.filter((m) => m.phase === 0).length
  const matchesTrusteePhase = allMatches.filter((m) => m.phase === 1).length
  const totalCompleted = allMatches.filter((m) => m.phase === PHASE_COMPLETED).length
  const allConfigs = Object.values(configs)
  const variationsActive = allConfigs.filter((c) => c.status === STATUS_ACTIVE).length
  const variationsClosed = allConfigs.filter((c) => c.status === STATUS_CLOSED).length
  const variationsEnded = allConfigs.filter((c) => c.status === STATUS_COMPLETED).length
  const progressPct = totalMatches > 0 ? Math.round((totalCompleted / totalMatches) * 100) : 0

  return (
    <Panel padded={false} className="bg-muted p-4 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs">
          <h2 className="t-micro">Overview</h2>
          {autoRefresh ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onToggleAutoRefresh(false)}
                    className="inline-flex items-center justify-center size-6 rounded-sm text-muted-foreground hover:text-foreground hover:bg-card"
                    aria-label="Pause auto-refresh"
                  >
                    <Pause className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Pause auto-refresh</TooltipContent>
              </Tooltip>
              <span className="inline-flex items-center gap-1.5 text-pos font-medium">
                <Dot tone="pos" className="animate-pulse" /> Live
              </span>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleAutoRefresh(true)
                      onRefresh()
                    }}
                    className="inline-flex items-center justify-center size-6 rounded-sm text-muted-foreground hover:text-foreground hover:bg-card"
                    aria-label="Start auto-refresh"
                  >
                    <Play className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Start auto-refresh</TooltipContent>
              </Tooltip>
              <Btn variant="ghost" size="sm" onClick={onRefresh}>
                <RotateCcw className="size-3" /> Refresh
              </Btn>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Btn variant="ghost" size="sm" disabled={!autoMatchEligible} onClick={() => onToggleAutoMatch(!autoMatch)}>
                {autoMatch ? (
                  <>
                    <Dot tone="pos" className="animate-pulse" /> <Pause className="size-3" /> Auto Match
                  </>
                ) : (
                  <>
                    <Play className="size-3" /> Auto Match
                  </>
                )}
              </Btn>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {!autoMatchEligible
                ? (autoMatchDisabledReason ?? 'Auto Match unavailable')
                : autoMatch
                  ? 'Pause auto-matching'
                  : 'Auto-match unassigned subjects across all active variations (FIFO)'}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="t-micro text-faint">Trust Experiment</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Variations"
          value={variations.length}
          desc={
            <>
              {variationsActive > 0 && <span className="text-primary">{variationsActive} active </span>}
              {variationsClosed > 0 && <span className="text-warn">{variationsClosed} closed </span>}
              {variationsEnded > 0 && <span className="text-neg">{variationsEnded} ended</span>}
            </>
          }
        />
        <StatCard
          title="Subjects"
          value={totalEnrolled}
          desc={
            <>
              <span className="text-primary">{totalAssigned} playing</span>
              {' · '}
              <span>{totalWaiting} waiting</span>
            </>
          }
        />
        <StatCard
          title="Total Matches"
          value={totalMatches}
          figure={<Gauge value={progressPct} size={48} />}
          desc={
            <>
              <span className="text-primary">{totalCompleted} completed</span>
              {' · '}
              <span>{matchesInvestorPhase + matchesTrusteePhase} in play</span>
            </>
          }
        />
      </div>
    </Panel>
  )
}

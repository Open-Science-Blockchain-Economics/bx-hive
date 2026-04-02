import { FaPause, FaPlay } from 'react-icons/fa'
import type { VariationInfo } from '../../../hooks/useTrustExperiments'
import { PHASE_COMPLETED, STATUS_ACTIVE, STATUS_CLOSED, STATUS_COMPLETED } from '../../../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../../../hooks/useTrustVariation'
import { StatCard } from '../../ui'

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
}

export default function OverviewStrip({
  variations,
  subjects,
  matches,
  configs,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
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
    <div className="bg-base-200 rounded-box p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 text-xs">
          <h2 className="text-sm font-semibold text-base-content/60">Overview</h2>
          {autoRefresh ? (
            <>
              <span className="tooltip tooltip-bottom" data-tip="Pause auto-refresh">
                <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={() => onToggleAutoRefresh(false)}>
                  <FaPause className="w-3 h-3" />
                </button>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-success font-medium">Live</span>
              </span>
            </>
          ) : (
            <>
              <span className="tooltip tooltip-bottom" data-tip="Start auto-refresh">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => {
                    onToggleAutoRefresh(true)
                    onRefresh()
                  }}
                >
                  <FaPlay className="w-3 h-3" />
                </button>
              </span>
              <button type="button" className="btn btn-ghost btn-xs" onClick={onRefresh}>
                ↻ Refresh
              </button>
            </>
          )}
        </div>
        <span className="text-xs uppercase tracking-wide text-base-content/30">Trust Experiment</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Variations"
          value={variations.length}
          desc={
            <>
              {variationsActive > 0 && <span className="text-primary">{variationsActive} active </span>}
              {variationsClosed > 0 && <span className="text-warning">{variationsClosed} closed </span>}
              {variationsEnded > 0 && <span className="text-error">{variationsEnded} ended</span>}
            </>
          }
        />
        <StatCard
          title="Subjects"
          value={totalEnrolled}
          desc={
            <>
              <span className="text-primary">{totalAssigned} playing</span>
              {' \u00b7 '}
              <span>{totalWaiting} waiting</span>
            </>
          }
        />
        <StatCard
          title="Total Matches"
          value={totalMatches}
          figure={
            <div
              className={`radial-progress text-xs ${progressPct === 100 ? 'text-primary' : 'text-base-content'}`}
              style={{ '--value': progressPct, '--size': '3rem', '--thickness': '4px' } as React.CSSProperties}
              role="progressbar"
            >
              {progressPct}%
            </div>
          }
          desc={
            <>
              <span className="text-primary">{totalCompleted} completed</span>
              {' \u00b7 '}
              <span>{matchesInvestorPhase + matchesTrusteePhase} in play</span>
            </>
          }
        />
      </div>
    </div>
  )
}

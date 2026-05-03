import { Panel } from '@/components/ds/card'
import { Gauge } from '@/components/ds/gauge'
import { StatCard } from '../../ui'
import type { VariationInfo } from '../../../hooks/useTrustExperiments'
import { PHASE_COMPLETED, STATUS_ACTIVE, STATUS_CLOSED, STATUS_COMPLETED } from '../../../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../../../hooks/useTrustVariation'
import { microAlgoToAlgo } from '../../../utils/amount'

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
}

function formatAlgo(algo: number): string {
  if (algo >= 1_000_000) return `${(algo / 1_000_000).toFixed(1)}M`
  if (algo >= 1_000) return `${(algo / 1_000).toFixed(1)}k`
  return algo.toFixed(2)
}

export default function OverviewStrip({ variations, subjects, matches, configs }: OverviewStripProps) {
  const allSubjects = Object.values(subjects).flat()
  const allMatches = Object.values(matches).flat()
  const totalEnrolled = allSubjects.length
  const totalWaiting = allSubjects.filter((s) => s.assigned === 0).length
  const totalAssigned = allSubjects.filter((s) => s.assigned === 1).length
  const totalMatches = allMatches.length
  const matchesInPlay = allMatches.filter((m) => m.phase === 0 || m.phase === 1).length
  const completedMatches = allMatches.filter((m) => m.phase === PHASE_COMPLETED)
  const totalCompleted = completedMatches.length
  const allConfigs = Object.values(configs)
  const variationsActive = allConfigs.filter((c) => c.status === STATUS_ACTIVE).length
  const variationsClosed = allConfigs.filter((c) => c.status === STATUS_CLOSED).length
  const variationsEnded = allConfigs.filter((c) => c.status === STATUS_COMPLETED).length
  const progressPct = totalMatches > 0 ? Math.round((totalCompleted / totalMatches) * 100) : 0

  const totalPayoutMicroAlgo = completedMatches.reduce((acc, m) => acc + m.investorPayout + m.trusteePayout, 0n)
  const totalPayoutAlgo = microAlgoToAlgo(totalPayoutMicroAlgo)
  const meanPayoutAlgo = totalCompleted > 0 ? totalPayoutAlgo / (totalCompleted * 2) : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Panel>
        <div className="t-micro mb-1.5">Run status</div>
        <div className="flex items-center gap-3">
          <Gauge value={progressPct} size={48} />
          <div>
            <div className="font-mono text-2xl font-medium leading-none tracking-[-0.01em] text-foreground">
              {totalCompleted} / {totalMatches}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              <span className="text-primary">{totalCompleted} completed</span>
              {matchesInPlay > 0 && (
                <>
                  {' · '}
                  <span>{matchesInPlay} in play</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Panel>
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
        title="Total payout"
        value={
          <>
            {formatAlgo(totalPayoutAlgo)}
            <span className="text-xs text-muted-foreground font-mono ml-1.5">ALGO</span>
          </>
        }
        desc={totalCompleted > 0 ? <>μ = {meanPayoutAlgo.toFixed(2)} / subject</> : <>no completed matches yet</>}
      />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { cn } from '@/lib/utils'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments, type ExperimentGroup, type VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation, type VariationConfig } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import ExperimentListTab from '../components/experimenter/ExperimentListTab'
import { deriveExperimentStatus } from '../utils/variationStatus'

interface OnChainExperiment {
  group: ExperimentGroup
  variations: VariationInfo[]
}

interface OnChainData {
  onChainExps: OnChainExperiment[]
  participantCounts: Record<string, number>
  variationConfigs: Record<string, VariationConfig>
}

type Filter = 'all' | 'live' | 'paused' | 'complete'

export default function ExperimenterDashboard() {
  const navigate = useNavigate()
  const { activeAddress } = useAlgorand()
  const { listExperiments, listVariations } = useTrustExperiments()
  const { getParticipantCount, getConfig } = useTrustVariation()
  const [filter, setFilter] = useState<Filter>('all')

  const { data: onChainData } = useSuspenseQuery<OnChainData>({
    queryKey: queryKeys.onChainExperiments(activeAddress!),
    queryFn: async () => {
      const groups = await listExperiments()
      const mine = groups.filter((g) => g.owner === activeAddress)
      const withVariations = await Promise.all(
        mine.map(async (group) => ({
          group,
          variations: await listVariations(group.expId, Number(group.variationCount)),
        })),
      )
      const onChainExps = withVariations.filter(({ group }) => {
        if (Number(group.variationCount) === 0) {
          // eslint-disable-next-line no-console
          console.warn(`[bx-hive] Orphaned experiment exp_id=${group.expId} name="${group.name}" has 0 variations — hiding from UI`)
          return false
        }
        return true
      })

      const counts: Record<string, number> = {}
      const configs: Record<string, VariationConfig> = {}
      await Promise.all(
        onChainExps.flatMap(({ variations: vars }) =>
          vars.map(async (v) => {
            const key = String(v.appId)
            try {
              counts[key] = await getParticipantCount(v.appId)
            } catch {
              counts[key] = 0
            }
            try {
              configs[key] = await getConfig(v.appId)
            } catch {
              /* config unavailable */
            }
          }),
        ),
      )

      return { onChainExps, participantCounts: counts, variationConfigs: configs }
    },
  })

  const aggregates = useMemo(() => {
    const exps = onChainData.onChainExps
    let totalParticipants = 0
    let totalVariations = 0
    let liveCount = 0
    let pausedCount = 0
    let completeCount = 0

    for (const e of exps) {
      totalVariations += e.variations.length
      for (const v of e.variations) {
        totalParticipants += onChainData.participantCounts[String(v.appId)] ?? 0
      }
      const configs = e.variations.map((v) => onChainData.variationConfigs[String(v.appId)]).filter((c): c is VariationConfig => Boolean(c))
      const status = deriveExperimentStatus(configs)
      if (status.label === 'Live') liveCount++
      else if (status.label === 'Paused') pausedCount++
      else if (status.label === 'Complete') completeCount++
    }

    return {
      totalExperiments: exps.length,
      totalVariations,
      totalParticipants,
      liveCount,
      pausedCount,
      completeCount,
    }
  }, [onChainData])

  const filterChip = (key: Filter, label: string, count?: number) => (
    <button
      type="button"
      onClick={() => setFilter(key)}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-xs font-semibold uppercase tracking-[0.04em] transition-colors',
        filter === key ? 'border-primary/35 bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      {count !== undefined && <span className="font-mono normal-case">· {count}</span>}
    </button>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="t-h1">Experimenter Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {aggregates.totalExperiments} experiment{aggregates.totalExperiments === 1 ? '' : 's'} · {aggregates.totalParticipants}{' '}
            participant
            {aggregates.totalParticipants === 1 ? '' : 's'} enrolled
          </p>
        </div>
        <Btn asChild variant="primary" size="sm">
          <Link to="/experimenter/create">
            <Plus className="size-3.5" /> New experiment
          </Link>
        </Btn>
      </div>

      {/* Summary tiles */}
      <Panel padded={false} className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          <div className="px-5 py-4 sm:border-r border-border border-b sm:border-b-0">
            <div className="t-micro mb-1.5">Active</div>
            <div className="font-mono text-2xl font-medium leading-none tracking-[-0.01em] text-foreground">{aggregates.liveCount}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {aggregates.pausedCount > 0 && <>{aggregates.pausedCount} paused · </>}
              {aggregates.completeCount} complete
            </div>
          </div>
          <div className="px-5 py-4 sm:border-r border-border border-b sm:border-b-0">
            <div className="t-micro mb-1.5">Variations</div>
            <div className="font-mono text-2xl font-medium leading-none tracking-[-0.01em] text-foreground">
              {aggregates.totalVariations}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              across {aggregates.totalExperiments} experiment{aggregates.totalExperiments === 1 ? '' : 's'}
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="t-micro mb-1.5">Participants</div>
            <div className="font-mono text-2xl font-medium leading-none tracking-[-0.01em] text-foreground">
              {aggregates.totalParticipants}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">enrolled across all variations</div>
          </div>
        </div>
      </Panel>

      {/* Filter chips */}
      {onChainData.onChainExps.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="t-micro mr-1">Filter</span>
          {filterChip('all', 'All', aggregates.totalExperiments)}
          {filterChip('live', 'Live', aggregates.liveCount)}
          {filterChip('paused', 'Paused', aggregates.pausedCount)}
          {filterChip('complete', 'Complete', aggregates.completeCount)}
          <span className="ml-auto t-micro font-mono text-muted-foreground">Sort — Recent ↓</span>
        </div>
      )}

      <ExperimentListTab
        onChainExps={onChainData.onChainExps}
        participantCounts={onChainData.participantCounts}
        variationConfigs={onChainData.variationConfigs}
        filter={filter}
        onCreateClick={() => navigate('/experimenter/create')}
      />
    </div>
  )
}

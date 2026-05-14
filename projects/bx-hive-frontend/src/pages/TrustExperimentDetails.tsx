import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pause, Play } from 'lucide-react'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Dot } from '@/components/ds/dot'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import { cn } from '@/lib/utils'
import OverviewStrip from '../components/experimenter/trust-details/OverviewStrip'
import VariationPanel from '../components/experimenter/trust-details/VariationPanel'
import { LoadingSpinner, StatusDot } from '../components/ui'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { STATUS_ACTIVE, useTrustVariation } from '../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../hooks/useTrustVariation'
import { useExperimentManager } from '../hooks/useExperimentManager'
import { queryKeys } from '../lib/queryKeys'
import { truncateAddress } from '../utils/address'
import { deriveExperimentStatus, statusDotColor, statusLabel, variationTooltip } from '../utils/variationStatus'

interface ParticipantEntry {
  address: string
  enrolled: number
  assigned: number
}

interface ExperimentDetailsData {
  group: ExperimentGroup
  variations: VariationInfo[]
  participants: Record<string, ParticipantEntry[]>
  matches: Record<string, Match[]>
  configs: Record<string, VariationConfig>
}

function formatExpId(id: number): string {
  return `EXP-${String(id).padStart(4, '0')}`
}

function formatCreatedAt(timestamp: bigint | number): string {
  const ms = Number(timestamp) * 1000
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TrustExperimentDetails() {
  const { expId: expIdParam } = useParams<{ expId: string }>()
  const expId = Number(expIdParam ?? '0')

  const { getExperiment, listVariations } = useTrustExperiments()
  const { getEnrolledParticipants, getMatches, getConfig, createMatch } = useTrustVariation()
  const { getExpConfig, setExpConfig, registerExperimentVariations } = useExperimentManager()
  const queryClient = useQueryClient()

  const [selectedVarIdx, setSelectedVarIdx] = useState(0)

  const expConfig = getExpConfig(expId)
  const autoRefresh = expConfig.autoRefresh
  const autoMatch = expConfig.autoMatch
  const setAutoRefresh = (val: boolean) => setExpConfig(expId, { autoRefresh: val })
  const setAutoMatch = (val: boolean) => setExpConfig(expId, { autoMatch: val })

  const { data, refetch } = useQuery<ExperimentDetailsData>({
    queryKey: queryKeys.trustExperimentDetails(expId),
    queryFn: async () => {
      const g = await getExperiment(expId)
      const vars = await listVariations(expId, Number(g.variationCount))

      const participants: Record<string, ParticipantEntry[]> = {}
      const matches: Record<string, Match[]> = {}
      const configs: Record<string, VariationConfig> = {}

      await Promise.all(
        vars.map(async (v) => {
          const key = String(v.appId)
          try {
            const [subs, matchList, cfg] = await Promise.all([getEnrolledParticipants(v.appId), getMatches(v.appId), getConfig(v.appId)])
            participants[key] = subs
            matches[key] = matchList
            configs[key] = cfg
          } catch {
            // ignore per-variation errors silently
          }
        }),
      )

      return { group: g, variations: vars, participants, matches, configs }
    },
    refetchInterval: autoRefresh ? 5000 : false,
  })

  const variations = data?.variations
  const configs = data?.configs

  useEffect(() => {
    if (!variations || !configs) return
    const registered = variations
      .map((v) => {
        const cfg = configs[String(v.appId)]
        if (!cfg) return null
        return { appId: v.appId, status: Number(cfg.status) }
      })
      .filter((x): x is { appId: bigint; status: number } => x !== null)
    registerExperimentVariations(expId, registered)
  }, [expId, variations, configs, registerExperimentVariations])

  const { autoMatchEligible, autoMatchDisabledReason } = useMemo(() => {
    if (!variations || !configs) {
      return { autoMatchEligible: false, autoMatchDisabledReason: 'Loading variations…' }
    }
    const hasActive = variations.some((v) => {
      const cfg = configs[String(v.appId)]
      return cfg && Number(cfg.status) === STATUS_ACTIVE
    })
    if (hasActive) {
      return { autoMatchEligible: true, autoMatchDisabledReason: undefined }
    }
    return {
      autoMatchEligible: false,
      autoMatchDisabledReason: 'Auto Match unavailable — no active variations.',
    }
  }, [variations, configs])

  const createMatchMutation = useMutation({
    mutationFn: ({ appId, investor, trustee }: { appId: bigint; investor: string; trustee: string }) =>
      createMatch(appId, investor, trustee),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trustExperimentDetails(expId) })
    },
  })

  if (!data) {
    return <LoadingSpinner />
  }

  const { group, variations: vars, participants: subs, matches, configs: cfgs } = data
  const selectedVar = vars[selectedVarIdx]
  const varKey = selectedVar ? String(selectedVar.appId) : ''
  const expStatus = deriveExperimentStatus(Object.values(cfgs))

  return (
    <div>
      {/* Title row: back + name + chips + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 flex-wrap">
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
          <h1 className="t-h1">{group.name}</h1>
          <Chip tone={expStatus.tone}>
            {expStatus.tone === 'pos' && <Dot tone="pos" size={6} />}
            {expStatus.label}
          </Chip>
          <Chip tone="accent">TRUST · TG</Chip>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (autoRefresh) {
                    setAutoRefresh(false)
                  } else {
                    setAutoRefresh(true)
                    void refetch()
                  }
                }}
              >
                {autoRefresh ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {autoRefresh ? 'Pause' : 'Resume'}
              </Btn>
            </TooltipTrigger>
            <TooltipContent side="bottom">{autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh (every 5s)'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Btn variant="secondary" size="sm" disabled={!autoMatchEligible} onClick={() => setAutoMatch(!autoMatch)}>
                {autoMatch && <Dot tone="pos" className="animate-pulse" />}
                Auto-match
              </Btn>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {!autoMatchEligible
                ? (autoMatchDisabledReason ?? 'Auto Match unavailable')
                : autoMatch
                  ? 'Pause auto-matching'
                  : 'Auto-match unassigned participants across all active variations (FIFO)'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Subtitle metadata row */}
      <div className="flex flex-wrap items-center gap-3 ml-11 text-sm text-muted-foreground mb-6">
        <span className="font-mono text-xs">{formatExpId(Number(group.expId))}</span>
        <span className="text-faint">·</span>
        <span>Created {formatCreatedAt(group.createdAt)}</span>
        <span className="text-faint">·</span>
        <span>
          Principal: <span className="font-mono text-xs text-ink-2">{truncateAddress(group.owner)}</span>
        </span>
      </div>

      <OverviewStrip variations={vars} participants={subs} matches={matches} configs={cfgs} />

      <h2 className="t-micro mb-3">Variation Details</h2>

      {vars.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No variations found.</div>
      ) : (
        <>
          <div role="tablist" className="flex flex-wrap gap-1 mb-0 border-b border-border">
            {vars.map((v, idx) => {
              const k = String(v.appId)
              const cfg = cfgs[k]
              const hasWaiting = (subs[k] ?? []).some((s) => s.assigned === 0)
              const isActive = selectedVarIdx === idx
              return (
                <Tooltip key={v.varId}>
                  <TooltipTrigger asChild>
                    <button
                      role="tab"
                      type="button"
                      onClick={() => setSelectedVarIdx(idx)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-sm font-medium transition-colors',
                        isActive ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground',
                      )}
                    >
                      Var {v.varId + 1}
                      <StatusDot color={statusDotColor(cfg, hasWaiting)} label={statusLabel(cfg)} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{variationTooltip(v, cfg)}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>

          {selectedVar && (
            <VariationPanel
              variation={selectedVar}
              participants={subs[varKey] ?? []}
              matches={matches[varKey] ?? []}
              config={cfgs[varKey]}
              onCreateMatch={async (appId, investor, trustee) => {
                await createMatchMutation.mutateAsync({ appId, investor, trustee })
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

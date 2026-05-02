import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import { cn } from '@/lib/utils'
import OverviewStrip from '../components/experimenter/trust-details/OverviewStrip'
import VariationPanel from '../components/experimenter/trust-details/VariationPanel'
import { LoadingSpinner, PageHeader, StatusDot } from '../components/ui'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { STATUS_ACTIVE, useTrustVariation } from '../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../hooks/useTrustVariation'
import { useExperimentManager } from '../hooks/useExperimentManager'
import { queryKeys } from '../lib/queryKeys'
import { statusDotColor, statusLabel, variationTooltip } from '../utils/variationStatus'

interface SubjectEntry {
  address: string
  enrolled: number
  assigned: number
}

interface ExperimentDetailsData {
  group: ExperimentGroup
  variations: VariationInfo[]
  subjects: Record<string, SubjectEntry[]>
  matches: Record<string, Match[]>
  configs: Record<string, VariationConfig>
}

export default function TrustExperimentDetails() {
  const { expId: expIdParam } = useParams<{ expId: string }>()
  const expId = Number(expIdParam ?? '0')

  const { getExperiment, listVariations } = useTrustExperiments()
  const { getEnrolledSubjects, getMatches, getConfig, createMatch } = useTrustVariation()
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

      const subjects: Record<string, SubjectEntry[]> = {}
      const matches: Record<string, Match[]> = {}
      const configs: Record<string, VariationConfig> = {}

      await Promise.all(
        vars.map(async (v) => {
          const key = String(v.appId)
          try {
            const [subs, matchList, cfg] = await Promise.all([getEnrolledSubjects(v.appId), getMatches(v.appId), getConfig(v.appId)])
            subjects[key] = subs
            matches[key] = matchList
            configs[key] = cfg
          } catch {
            // ignore per-variation errors silently
          }
        }),
      )

      return { group: g, variations: vars, subjects, matches, configs }
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

  const { group, variations: vars, subjects: subs, matches, configs: cfgs } = data
  const selectedVar = vars[selectedVarIdx]
  const varKey = selectedVar ? String(selectedVar.appId) : ''

  return (
    <div>
      <PageHeader title={group.name} backTo="/dashboard/experimenter" backTooltip="Back to Experimenter Dashboard" />

      <OverviewStrip
        variations={vars}
        subjects={subs}
        matches={matches}
        configs={cfgs}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={setAutoRefresh}
        onRefresh={() => void refetch()}
        autoMatch={autoMatch}
        onToggleAutoMatch={setAutoMatch}
        autoMatchEligible={autoMatchEligible}
        autoMatchDisabledReason={autoMatchDisabledReason}
      />

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
              subjects={subs[varKey] ?? []}
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

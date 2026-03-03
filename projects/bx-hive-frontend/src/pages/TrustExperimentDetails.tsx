import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import OverviewStrip from '../components/experimenter/trust-details/OverviewStrip'
import VariationPanel from '../components/experimenter/trust-details/VariationPanel'
import { LoadingSpinner, PageHeader, StatusDot } from '../components/ui'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { useTrustVariation } from '../hooks/useTrustVariation'
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
  const { getExpConfig, setExpConfig, getVarConfig, setVarConfig } = useExperimentManager()
  const queryClient = useQueryClient()

  const [selectedVarIdx, setSelectedVarIdx] = useState(0)

  const autoRefresh = getExpConfig(expId).autoRefresh
  const setAutoRefresh = (val: boolean) => setExpConfig(expId, { autoRefresh: val })

  const {
    data,
    refetch,
  } = useQuery<ExperimentDetailsData>({
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

  const { group, variations, subjects, matches, configs } = data
  const selectedVar = variations[selectedVarIdx]
  const varKey = selectedVar ? String(selectedVar.appId) : ''

  return (
    <div>
      <PageHeader
        title={group.name}
        backTo="/dashboard/experimenter"
        backTooltip="Back to Experimenter Dashboard"
      />

      <OverviewStrip
        variations={variations}
        subjects={subjects}
        matches={matches}
        configs={configs}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={setAutoRefresh}
        onRefresh={() => void refetch()}
      />

      <h2 className="text-xs uppercase tracking-wide text-base-content/50 mb-3">Variation Details</h2>

      {variations.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">No variations found.</div>
      ) : (
        <>
          <div role="tablist" className="tabs tabs-border mb-0">
            {variations.map((v, idx) => {
              const k = String(v.appId)
              const cfg = configs[k]
              const hasWaiting = (subjects[k] ?? []).some((s) => s.assigned === 0)
              return (
                <button
                  key={v.varId}
                  role="tab"
                  type="button"
                  className={`tab${selectedVarIdx === idx ? ' tab-active' : ''}`}
                  onClick={() => setSelectedVarIdx(idx)}
                >
                  <span className="tooltip tooltip-bottom flex gap-1 items-center" data-tip={variationTooltip(v, cfg)}>
                    Var {v.varId + 1}
                    <StatusDot color={statusDotColor(cfg, hasWaiting)} label={statusLabel(cfg)} />
                  </span>
                </button>
              )
            })}
          </div>

          {selectedVar && (
            <VariationPanel
              variation={selectedVar}
              subjects={subjects[varKey] ?? []}
              matches={matches[varKey] ?? []}
              config={configs[varKey]}
              autoMatch={getVarConfig(selectedVar.appId).autoMatch}
              onToggleAutoMatch={(val) => setVarConfig(selectedVar.appId, { autoMatch: val })}
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
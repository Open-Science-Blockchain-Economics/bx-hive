import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import OverviewStrip from '../components/experimenter/trust-details/OverviewStrip'
import VariationPanel from '../components/experimenter/trust-details/VariationPanel'
import { LoadingSpinner, ErrorMessage, PageHeader, StatusDot } from '../components/ui'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { useTrustVariation } from '../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../hooks/useTrustVariation'
import { useExperimentManager } from '../hooks/useExperimentManager'
import { statusDotColor, statusLabel, variationTooltip } from '../utils/variationStatus'

interface SubjectEntry {
  address: string
  enrolled: number
  assigned: number
}

export default function TrustExperimentDetails() {
  const { expId: expIdParam } = useParams<{ expId: string }>()
  const expId = Number(expIdParam ?? '0')

  const { getExperiment, listVariations } = useTrustExperiments()
  const { getEnrolledSubjects, getMatches, getConfig, createMatch } = useTrustVariation()
  const { getExpConfig, setExpConfig, getVarConfig, setVarConfig } = useExperimentManager()

  const [group, setGroup] = useState<ExperimentGroup | null>(null)
  const [variations, setVariations] = useState<VariationInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVarIdx, setSelectedVarIdx] = useState(0)

  const [subjects, setSubjects] = useState<Record<string, SubjectEntry[]>>({})
  const [matches, setMatches] = useState<Record<string, Match[]>>({})
  const [configs, setConfigs] = useState<Record<string, VariationConfig>>({})
  const [loadingVar, setLoadingVar] = useState<Record<string, boolean>>({})

  const autoRefresh = getExpConfig(expId).autoRefresh
  const setAutoRefresh = (val: boolean) => setExpConfig(expId, { autoRefresh: val })

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const g = await getExperiment(expId)
        setGroup(g)
        const vars = await listVariations(expId, Number(g.variationCount))
        setVariations(vars)
        if (vars.length > 0) {
          await Promise.all(vars.map((v) => loadVariationData(v.appId)))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load experiment')
      } finally {
        setLoading(false)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expId])

  const loadVariationData = useCallback(
    async (appId: bigint) => {
      const key = String(appId)
      setLoadingVar((p) => ({ ...p, [key]: true }))
      try {
        const [subs, matchList, cfg] = await Promise.all([getEnrolledSubjects(appId), getMatches(appId), getConfig(appId)])
        setSubjects((p) => ({ ...p, [key]: subs }))
        setMatches((p) => ({ ...p, [key]: matchList }))
        setConfigs((p) => ({ ...p, [key]: cfg }))
      } catch {
        // ignore per-variation errors silently
      } finally {
        setLoadingVar((p) => ({ ...p, [key]: false }))
      }
    },
    [getEnrolledSubjects, getMatches, getConfig],
  )

  const refreshAll = useCallback(async () => {
    if (variations.length === 0) return
    await Promise.all(variations.map((v) => loadVariationData(v.appId)))
  }, [variations, loadVariationData])

  useEffect(() => {
    if (!autoRefresh || variations.length === 0) return
    const id = setInterval(() => void refreshAll(), 5000)
    return () => clearInterval(id)
  }, [autoRefresh, variations, refreshAll])

  function selectTab(idx: number, appId: bigint) {
    setSelectedVarIdx(idx)
    const key = String(appId)
    if (!subjects[key] && !loadingVar[key]) {
      void loadVariationData(appId)
    }
  }

  async function handleCreateMatch(appId: bigint, investor: string, trustee: string) {
    await createMatch(appId, investor, trustee)
    await loadVariationData(appId)
  }

  if (loading) return <LoadingSpinner className="flex justify-center py-16" />

  if (error || !group) {
    return <ErrorMessage message={error ?? 'Experiment not found'} />
  }

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
        onRefresh={() => void refreshAll()}
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
                  onClick={() => selectTab(idx, v.appId)}
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
              isLoading={loadingVar[varKey] ?? false}
              autoMatch={getVarConfig(selectedVar.appId).autoMatch}
              onToggleAutoMatch={(val) => setVarConfig(selectedVar.appId, { autoMatch: val })}
              onCreateMatch={handleCreateMatch}
            />
          )}
        </>
      )}
    </div>
  )
}

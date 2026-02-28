import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { PHASE_COMPLETED, STATUS_ACTIVE, STATUS_CLOSED, STATUS_COMPLETED, useTrustVariation } from '../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../hooks/useTrustVariation'
import { microAlgoToAlgo } from '../utils/amount'

interface SubjectEntry {
  address: string
  enrolled: number
  assigned: number
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function statusLabel(config: VariationConfig | undefined): string {
  if (!config) return '—'
  if (config.status === STATUS_COMPLETED) return 'Ended'
  if (config.status === STATUS_CLOSED) return 'Closed'
  return 'Active'
}

function statusDotColor(config: VariationConfig | undefined): string {
  if (!config) return 'bg-base-300'
  if (config.status === STATUS_COMPLETED) return 'bg-error'
  if (config.status === STATUS_CLOSED) return 'bg-warning'
  return 'bg-success'
}

function variationTooltip(v: VariationInfo, config: VariationConfig | undefined): string {
  const status = config ? statusLabel(config) : 'Loading…'
  if (!config) return `${v.label} · ${status}`
  const e1 = microAlgoToAlgo(config.e1).toFixed(3)
  const e2 = microAlgoToAlgo(config.e2).toFixed(3)
  const unit = microAlgoToAlgo(config.unit).toFixed(3)
  return `${status} · E1: ${e1} · E2: ${e2} · ×${config.multiplier} · unit: ${unit}`
}

export default function TrustExperimentDetails() {
  const { expId: expIdParam } = useParams<{ expId: string }>()
  const expId = Number(expIdParam ?? '0')

  const { getExperiment, listVariations } = useTrustExperiments()
  const { getEnrolledSubjects, getMatches, getConfig, createMatch } = useTrustVariation()

  const [group, setGroup] = useState<ExperimentGroup | null>(null)
  const [variations, setVariations] = useState<VariationInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedVarIdx, setSelectedVarIdx] = useState(0)

  // Per-variation data keyed by appId string
  const [subjects, setSubjects] = useState<Record<string, SubjectEntry[]>>({})
  const [matches, setMatches] = useState<Record<string, Match[]>>({})
  const [configs, setConfigs] = useState<Record<string, VariationConfig>>({})
  const [loadingVar, setLoadingVar] = useState<Record<string, boolean>>({})

  // Match creation state
  const [matchInvestor, setMatchInvestor] = useState<Record<string, string>>({})
  const [matchTrustee, setMatchTrustee] = useState<Record<string, string>>({})
  const [creatingMatch, setCreatingMatch] = useState<Record<string, boolean>>({})
  const [matchError, setMatchError] = useState<Record<string, string>>({})

  // Load experiment group + variations on mount
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const g = await getExperiment(expId)
        setGroup(g)
        const vars = await listVariations(expId, Number(g.variationCount))
        setVariations(vars)
        // Pre-load ALL variations so aggregate stats are correct immediately
        if (vars.length > 0) {
          void Promise.all(vars.map((v) => loadVariationData(v.appId)))
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
        const [subs, matchList, cfg] = await Promise.all([
          getEnrolledSubjects(appId),
          getMatches(appId),
          getConfig(appId),
        ])
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

  function selectTab(idx: number, appId: bigint) {
    setSelectedVarIdx(idx)
    const key = String(appId)
    if (!subjects[key] && !loadingVar[key]) {
      void loadVariationData(appId)
    }
  }

  async function handleCreateMatch(appId: bigint) {
    const key = String(appId)
    const investor = matchInvestor[key] ?? ''
    const trustee = matchTrustee[key] ?? ''
    if (!investor || !trustee || investor === trustee) return
    setCreatingMatch((p) => ({ ...p, [key]: true }))
    setMatchError((p) => ({ ...p, [key]: '' }))
    try {
      await createMatch(appId, investor, trustee)
      setMatchInvestor((p) => ({ ...p, [key]: '' }))
      setMatchTrustee((p) => ({ ...p, [key]: '' }))
      await loadVariationData(appId)
    } catch (err) {
      setMatchError((p) => ({ ...p, [key]: err instanceof Error ? err.message : 'Failed to create match' }))
    } finally {
      setCreatingMatch((p) => ({ ...p, [key]: false }))
    }
  }

  // Summary strip — computed across all loaded variation subjects + matches
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="text-center py-16">
        <p className="text-error mb-4">{error ?? 'Experiment not found'}</p>
        <Link to="/dashboard/experimenter" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    )
  }

  const selectedVar = variations[selectedVarIdx]
  const varKey = selectedVar ? String(selectedVar.appId) : ''
  const varSubjects = subjects[varKey] ?? []
  const varMatches = matches[varKey] ?? []
  const varConfig = configs[varKey]
  const unassigned = varSubjects.filter((s) => s.assigned === 0)
  const isLoadingVar = loadingVar[varKey] ?? false

  return (
    <div>
      {/* Back */}
      <Link to="/dashboard/experimenter" className="btn btn-ghost btn-sm mb-4">
        ← Experimenter Dashboard
      </Link>

      {/* Overview section */}
      <div className="bg-base-200 rounded-box p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-base-content/40">{group.name} Overview</h2>
          <span className="text-xs uppercase tracking-wide text-base-content/50">Trust Experiment</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Variations */}
          <div className="stat bg-base-200 rounded-box py-3">
            <div className="stat-title">Variations</div>
            <div className="stat-value text-2xl">{variations.length}</div>
            <div className="stat-desc">
              {variationsActive > 0 && <span className="text-primary">{variationsActive} active </span>}
              {variationsClosed > 0 && <span className="text-warning">{variationsClosed} closed </span>}
              {variationsEnded > 0 && <span className="text-error">{variationsEnded} ended</span>}
            </div>
          </div>

          {/* Subjects */}
          <div className="stat bg-base-200 rounded-box py-3">
            <div className="stat-title">Subjects</div>
            <div className="stat-value text-2xl">{totalEnrolled}</div>
            <div className="stat-desc">
              <span className="text-primary">{totalAssigned} playing</span>
              {' · '}
              <span>{totalWaiting} waiting</span>
            </div>
          </div>

          {/* Matches */}
          <div className="stat bg-base-200 rounded-box py-3">
            <div className="stat-figure">
              <div
                className="radial-progress text-primary text-xs"
                style={{ '--value': progressPct, '--size': '3rem', '--thickness': '4px' } as React.CSSProperties}
                role="progressbar"
              >
                {progressPct}%
              </div>
            </div>
            <div className="stat-title">Total Matches</div>
            <div className="stat-value text-2xl">{totalMatches}</div>
            <div className="stat-desc">
              <span className="text-primary">{totalCompleted} completed</span>
              {' · '}
              <span>{matchesInvestorPhase + matchesTrusteePhase} in play</span>
            </div>
          </div>
        </div>
      </div>

      {/* Variation Details section */}
      <h2 className="text-xs uppercase tracking-wide text-base-content/50 mb-3">Variation Details</h2>
      {variations.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">No variations found.</div>
      ) : (
        <>
          {/* Tabs */}
          <div role="tablist" className="tabs tabs-border mb-0">
            {variations.map((v, idx) => {
              const k = String(v.appId)
              const cfg = configs[k]
              return (
                <button
                  key={v.varId}
                  role="tab"
                  type="button"
                  className={`tab${selectedVarIdx === idx ? ' tab-active' : ''}`}
                  onClick={() => selectTab(idx, v.appId)}
                >
                  <span
                    className="tooltip tooltip-bottom"
                    data-tip={variationTooltip(v, cfg)}
                  >
                    Var {v.varId + 1}
                    <span
                      className={`inline-block w-2 h-2 rounded-full ml-2 ${statusDotColor(cfg)}`}
                      aria-label={statusLabel(cfg)}
                    />
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tab panel */}
          {selectedVar && (
            <div className="rounded-b-box rounded-tr-box p-5 space-y-6">
              {/* Variation config card */}
              {varConfig ? (
                <div className="bg-base-200 rounded-box p-3">
                  <div className="mb-2">
                    <span className="font-mono text-xs text-base-content/50">app #{String(selectedVar.appId)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="stats stats-horizontal shadow-none bg-transparent text-sm w-full">
                      <div className="stat py-1 px-3">
                        <div className="stat-title text-xs">E1 Endowment</div>
                        <div className="stat-value text-base font-semibold">{microAlgoToAlgo(varConfig.e1).toFixed(3)}</div>
                        <div className="stat-desc">ALGO</div>
                      </div>
                      <div className="stat py-1 px-3">
                        <div className="stat-title text-xs">E2 Endowment</div>
                        <div className="stat-value text-base font-semibold">{microAlgoToAlgo(varConfig.e2).toFixed(3)}</div>
                        <div className="stat-desc">ALGO</div>
                      </div>
                      <div className="stat py-1 px-3">
                        <div className="stat-title text-xs">Multiplier</div>
                        <div className="stat-value text-base font-semibold">×{String(varConfig.multiplier)}</div>
                        <div className="stat-desc">trust factor</div>
                      </div>
                      <div className="stat py-1 px-3">
                        <div className="stat-title text-xs">Unit Size</div>
                        <div className="stat-value text-base font-semibold">{microAlgoToAlgo(varConfig.unit).toFixed(3)}</div>
                        <div className="stat-desc">ALGO</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-base-content/50 font-mono">app #{String(selectedVar.appId)}</div>
              )}

              {/* Subjects section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Subjects ({varSubjects.length})</h3>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => void loadVariationData(selectedVar.appId)}
                    disabled={isLoadingVar}
                  >
                    {isLoadingVar ? <span className="loading loading-spinner loading-xs" /> : '↻ Refresh'}
                  </button>
                </div>

                {isLoadingVar && varSubjects.length === 0 ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                ) : varSubjects.length === 0 ? (
                  <p className="text-sm text-base-content/50">No subjects enrolled yet.</p>
                ) : (
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Address</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varSubjects.map((s) => (
                        <tr key={s.address}>
                          <td className="font-mono text-xs">{truncAddr(s.address)}</td>
                          <td>
                            <span className={`badge badge-sm ${s.assigned ? 'badge-success' : 'badge-ghost'}`}>
                              {s.assigned ? 'Assigned' : 'Waiting'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Create Match section */}
              {varConfig && varConfig.status === STATUS_ACTIVE && (
                <div>
                  <h3 className="font-semibold mb-3">Create Match</h3>
                  {unassigned.length < 2 ? (
                    <p className="text-sm text-base-content/50">
                      Need at least 2 unassigned subjects to create a match.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-40">
                          <label className="label label-text text-xs pb-1">Investor</label>
                          <select
                            className="select select-sm select-bordered w-full"
                            value={matchInvestor[varKey] ?? ''}
                            onChange={(e) => setMatchInvestor((p) => ({ ...p, [varKey]: e.target.value }))}
                          >
                            <option value="">Select investor…</option>
                            {unassigned.map((s) => (
                              <option key={s.address} value={s.address}>{truncAddr(s.address)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1 min-w-40">
                          <label className="label label-text text-xs pb-1">Trustee</label>
                          <select
                            className="select select-sm select-bordered w-full"
                            value={matchTrustee[varKey] ?? ''}
                            onChange={(e) => setMatchTrustee((p) => ({ ...p, [varKey]: e.target.value }))}
                          >
                            <option value="">Select trustee…</option>
                            {unassigned.map((s) => (
                              <option key={s.address} value={s.address}>{truncAddr(s.address)}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={
                            !matchInvestor[varKey] ||
                            !matchTrustee[varKey] ||
                            matchInvestor[varKey] === matchTrustee[varKey] ||
                            creatingMatch[varKey]
                          }
                          onClick={() => void handleCreateMatch(selectedVar.appId)}
                        >
                          {creatingMatch[varKey]
                            ? <span className="loading loading-spinner loading-xs" />
                            : 'Create Match'}
                        </button>
                      </div>
                      {matchInvestor[varKey] && matchTrustee[varKey] && matchInvestor[varKey] === matchTrustee[varKey] && (
                        <p className="text-warning text-xs">Investor and trustee must be different subjects.</p>
                      )}
                      {matchError[varKey] && (
                        <p className="text-error text-xs">{matchError[varKey]}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Matches section */}
              <div>
                <h3 className="font-semibold mb-3">Matches ({varMatches.length})</h3>
                {varMatches.length === 0 ? (
                  <p className="text-sm text-base-content/50">No matches created yet.</p>
                ) : (
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Investor</th>
                        <th>Trustee</th>
                        <th>Phase</th>
                        <th>Investor Payout</th>
                        <th>Trustee Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varMatches.map((m) => (
                        <tr key={m.matchId}>
                          <td>{m.matchId}</td>
                          <td className="font-mono text-xs">{truncAddr(m.investor)}</td>
                          <td className="font-mono text-xs">{truncAddr(m.trustee)}</td>
                          <td>
                            {m.phase === PHASE_COMPLETED ? (
                              <span className="badge badge-sm badge-success">Completed</span>
                            ) : m.phase === 1 ? (
                              <span className="badge badge-sm badge-warning">Trustee deciding</span>
                            ) : (
                              <span className="badge badge-sm badge-info">Investor deciding</span>
                            )}
                          </td>
                          <td>{m.phase === PHASE_COMPLETED ? `${microAlgoToAlgo(m.investorPayout).toFixed(3)} ALGO` : '—'}</td>
                          <td>{m.phase === PHASE_COMPLETED ? `${microAlgoToAlgo(m.trusteePayout).toFixed(3)} ALGO` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ExperimentCard from '../components/subject/ExperimentCard'
import { getBatches, getExperiments, getExperimentsByBatchId, registerForBatch, registerForExperiment } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation, PHASE_COMPLETED, PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION } from '../hooks/useTrustVariation'
import type { Match as OnChainMatch } from '../hooks/useTrustVariation'
import { pickVariationRoundRobin, type VariationSlot } from '../utils/distributeSubjects'
import { microAlgoToAlgo } from '../utils/amount'
import type { Experiment, ExperimentBatch } from '../types'

interface SubjectExperimentView {
  id: string
  isBatch: boolean
  experiment: Experiment
  totalPlayers: number
  displayParameters: Record<string, number | string>
  userExperimentId?: string
}

interface OnChainMatchView {
  appId: bigint
  match: OnChainMatch
}

interface OnChainExperimentView {
  group: ExperimentGroup
  variations: VariationInfo[]
  enrolled: boolean // subject is enrolled in at least one variation
  hasMatch: boolean // subject has an active or completed match
}

export default function SubjectDashboard() {
  const { activeUser } = useActiveUser()
  const { activeAddress } = useAlgorand()
  const { listExperiments, listVariations } = useTrustExperiments()
  const { getPlayerMatch, selfEnroll, getSubjectCount, isSubjectEnrolled } = useTrustVariation()

  // Local BRET state
  const [experimentViews, setExperimentViews] = useState<SubjectExperimentView[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  // On-chain trust game state
  const [onChainMatches, setOnChainMatches] = useState<OnChainMatchView[]>([])
  const [onChainExperiments, setOnChainExperiments] = useState<OnChainExperimentView[]>([])
  const [onChainLoading, setOnChainLoading] = useState(true)
  const [joining, setJoining] = useState<number | null>(null) // exp_id being joined
  const [joinError, setJoinError] = useState<string | null>(null)

  const loadOnChainData = useCallback(async () => {
    if (!activeAddress) { setOnChainLoading(false); return }
    try {
      setOnChainLoading(true)
      const groups = await listExperiments()
      const matchViews: OnChainMatchView[] = []
      const expViews: OnChainExperimentView[] = []

      for (const group of groups) {
        const vars = await listVariations(group.expId, Number(group.variationCount))
        let enrolled = false
        let hasMatch = false

        for (const v of vars) {
          const match = await getPlayerMatch(v.appId, activeAddress)
          if (match) {
            matchViews.push({ appId: v.appId, match })
            enrolled = true
            hasMatch = true
          }
        }

        // Check enrollment without match (subject enrolled but not yet paired)
        if (!enrolled) {
          for (const v of vars) {
            try {
              if (await isSubjectEnrolled(v.appId, activeAddress)) {
                enrolled = true
                break
              }
            } catch {
              // ignore
            }
          }
        }

        expViews.push({ group, variations: vars, enrolled, hasMatch })
      }

      setOnChainMatches(matchViews)
      setOnChainExperiments(expViews)
    } catch (err) {
      console.error('Failed to load on-chain data:', err)
    } finally {
      setOnChainLoading(false)
    }
  }, [activeAddress, listExperiments, listVariations, getPlayerMatch, isSubjectEnrolled])

  useEffect(() => {
    void loadLocalExperiments()
    void loadOnChainData()
  }, [activeAddress, loadOnChainData])

  async function handleJoinExperiment(expId: number, variations: VariationInfo[]) {
    if (!activeAddress) return
    setJoining(expId)
    setJoinError(null)
    try {
      // Query subject counts + max_subjects across all variations
      const slots: VariationSlot[] = await Promise.all(
        variations.map(async (v) => {
          const count = await getSubjectCount(v.appId)
          // max_subjects is stored in global state; the contract enforces the cap
          // on-chain regardless, so using 0 (unlimited) here is safe
          return { appId: v.appId, subjectCount: count, maxSubjects: 0 }
        }),
      )

      const chosenAppId = pickVariationRoundRobin(slots)
      if (!chosenAppId) {
        setJoinError('All variations are full')
        return
      }

      await selfEnroll(chosenAppId)
      await loadOnChainData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join experiment'
      if (msg.includes('Already enrolled')) {
        setJoinError('You are already enrolled in this experiment')
      } else if (msg.includes('User not found')) {
        setJoinError('Please register your account first (Sign Up page)')
      } else {
        setJoinError(msg)
      }
    } finally {
      setJoining(null)
    }
  }

  async function loadLocalExperiments() {
    try {
      setLocalLoading(true)
      const allExperiments = await getExperiments()
      const allBatches = await getBatches()
      const views: SubjectExperimentView[] = []

      const standaloneExperiments = allExperiments.filter((exp) => !exp.batchId && exp.status === 'active' && exp.templateId === 'bret')
      for (const exp of standaloneExperiments) {
        views.push({ id: exp.id, isBatch: false, experiment: exp, totalPlayers: exp.players.length, displayParameters: exp.parameters })
      }

      for (const batch of allBatches) {
        if (batch.status !== 'active' || batch.templateId !== 'bret') continue
        const batchExperiments = await getExperimentsByBatchId(batch.id)
        if (batchExperiments.length === 0) continue
        const totalPlayers = batchExperiments.reduce((sum, exp) => sum + exp.players.length, 0)
        let userExperimentId: string | undefined
        if (activeUser) {
          for (const exp of batchExperiments) {
            if (exp.players.some((p) => p.userId === activeUser.id)) { userExperimentId = exp.id; break }
          }
        }
        const representative: Experiment = {
          ...batchExperiments[0],
          players: batchExperiments.flatMap((e) => e.players),
          matches: batchExperiments.flatMap((e) => e.matches),
        }
        views.push({ id: batch.id, isBatch: true, experiment: representative, totalPlayers, displayParameters: (batch as ExperimentBatch).baseParameters, userExperimentId })
      }

      setExperimentViews(views)
    } catch (err) {
      console.error('Failed to load local experiments:', err)
    } finally {
      setLocalLoading(false)
    }
  }

  function isRegistered(view: SubjectExperimentView): boolean {
    if (!activeUser) return false
    return view.experiment.players.some((p) => p.userId === activeUser.id)
  }

  function hasActiveMatch(view: SubjectExperimentView): boolean {
    if (!activeUser) return false
    return view.experiment.matches.some((m) => (m.player1Id === activeUser.id || m.player2Id === activeUser.id) && m.status === 'playing')
  }

  function hasCompletedMatch(view: SubjectExperimentView): boolean {
    if (!activeUser) return false
    return view.experiment.matches.some((m) => (m.player1Id === activeUser.id || m.player2Id === activeUser.id) && m.status === 'completed')
  }

  async function handleRegister(view: SubjectExperimentView, playerCount: 1 | 2) {
    if (!activeUser) return
    try {
      setRegistering(view.id)
      if (view.isBatch) {
        await registerForBatch(view.id, activeUser.id, playerCount)
      } else {
        await registerForExperiment(view.id, activeUser.id, playerCount)
      }
      await loadLocalExperiments()
    } catch (err) {
      console.error('Failed to register:', err)
    } finally {
      setRegistering(null)
    }
  }

  const activeOnChain = onChainMatches.filter((v) => v.match.phase !== PHASE_COMPLETED)
  const completedOnChain = onChainMatches.filter((v) => v.match.phase === PHASE_COMPLETED)
  // Experiments available to join (not enrolled, not matched)
  const joinableExperiments = onChainExperiments.filter((e) => !e.enrolled && !e.hasMatch)
  // Experiments enrolled but waiting for match
  const enrolledWaiting = onChainExperiments.filter((e) => e.enrolled && !e.hasMatch)
  const availableViews = experimentViews.filter((view) => !hasCompletedMatch(view))
  const completedViews = experimentViews.filter((view) => hasCompletedMatch(view))

  const isLoading = localLoading || onChainLoading

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subject Dashboard</h1>
        <p className="text-base-content/70 mt-2">View and participate in experiments</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Trust Game: Available to Join ── */}
          {joinableExperiments.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Available</h2>
              <div className="grid gap-4">
                {joinableExperiments.map(({ group, variations }) => (
                  <div key={group.expId} className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="card-title">{group.name}</h3>
                          <p className="text-sm text-base-content/70">
                            Trust Game · {Number(group.variationCount)} variation{Number(group.variationCount) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="badge badge-info">Open</span>
                      </div>
                      {joinError && joining === null && (
                        <div className="text-error text-sm mt-2">{joinError}</div>
                      )}
                      <div className="card-actions justify-end mt-2">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={joining !== null}
                          onClick={() => void handleJoinExperiment(group.expId, variations)}
                        >
                          {joining === group.expId ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            'Join Experiment'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Trust Game: Enrolled, waiting for match ── */}
          {enrolledWaiting.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Enrolled</h2>
              <div className="grid gap-4">
                {enrolledWaiting.map(({ group }) => (
                  <div key={group.expId} className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="card-title">{group.name}</h3>
                          <p className="text-sm text-base-content/70">Enrolled — waiting for match assignment</p>
                        </div>
                        <span className="badge badge-ghost">Waiting</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Active Trust Game matches ── */}
          {activeOnChain.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Active</h2>
              <div className="grid gap-4">
                {activeOnChain.map(({ appId, match }) => {
                  const isInvestor = match.investor === activeAddress
                  const isMyTurn =
                    (isInvestor && match.phase === PHASE_INVESTOR_DECISION) ||
                    (!isInvestor && match.phase === PHASE_TRUSTEE_DECISION)

                  return (
                    <div key={String(appId)} className="card bg-base-100 border border-base-300">
                      <div className="card-body">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="card-title">Trust Game</h3>
                            <p className="text-xs text-base-content/50 mt-1">
                              Role: <span className="font-medium">{isInvestor ? 'Investor' : 'Trustee'}</span>
                            </p>
                          </div>
                          <span className={`badge ${isMyTurn ? 'badge-warning' : 'badge-ghost'}`}>
                            {isMyTurn ? 'Your Turn' : 'Waiting'}
                          </span>
                        </div>
                        <div className="card-actions justify-end mt-2">
                          {isMyTurn ? (
                            <Link to={`/play/${String(appId)}`} className="btn btn-success btn-sm">
                              Play
                            </Link>
                          ) : (
                            <Link to={`/play/${String(appId)}`} className="btn btn-ghost btn-sm">
                              View Status
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Completed Trust Game matches ── */}
          {completedOnChain.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Completed</h2>
              <div className="grid gap-4">
                {completedOnChain.map(({ appId, match }) => (
                  <div key={String(appId)} className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="card-title">Trust Game</h3>
                          <p className="text-xs text-base-content/50 mt-1">
                            Payout:{' '}
                            <span className="font-medium text-success">
                              {microAlgoToAlgo(match.investor === activeAddress ? match.investorPayout : match.trusteePayout).toLocaleString()} ALGO
                            </span>
                          </p>
                        </div>
                        <span className="badge badge-success">Completed</span>
                      </div>
                      <div className="card-actions justify-end mt-2">
                        <Link to={`/play/${String(appId)}`} className="btn btn-ghost btn-sm">
                          View Results
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* No trust activity at all */}
          {joinableExperiments.length === 0 && enrolledWaiting.length === 0 && activeOnChain.length === 0 && completedOnChain.length === 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game</h2>
              <div className="text-center py-8 text-base-content/70 bg-base-200 rounded-lg">
                <p>No Trust Game experiments available yet.</p>
              </div>
            </section>
          )}

          {/* ── BRET (local) experiments ── */}
          {(availableViews.length > 0 || completedViews.length > 0) && (
            <>
              {availableViews.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4">BRET Experiments — Available</h2>
                  <div className="grid gap-4">
                    {availableViews.map((view) => (
                      <ExperimentCard
                        key={view.id}
                        experiment={view.experiment}
                        isCompleted={false}
                        isRegistered={isRegistered(view)}
                        hasActiveMatch={hasActiveMatch(view)}
                        isRegistering={registering === view.id}
                        onRegister={(playerCount) => void handleRegister(view, playerCount)}
                        isBatch={view.isBatch}
                        totalPlayers={view.totalPlayers}
                        playExperimentId={view.userExperimentId ?? view.experiment.id}
                        displayParameters={view.displayParameters}
                      />
                    ))}
                  </div>
                </section>
              )}

              {completedViews.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4">BRET Experiments — Completed</h2>
                  <div className="grid gap-4">
                    {completedViews.map((view) => (
                      <ExperimentCard
                        key={view.id}
                        experiment={view.experiment}
                        isCompleted={true}
                        isRegistered={true}
                        hasActiveMatch={false}
                        isRegistering={false}
                        onRegister={() => {}}
                        isBatch={view.isBatch}
                        totalPlayers={view.totalPlayers}
                        playExperimentId={view.userExperimentId ?? view.experiment.id}
                        displayParameters={view.displayParameters}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
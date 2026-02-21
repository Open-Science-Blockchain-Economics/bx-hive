import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ExperimentCard from '../components/subject/ExperimentCard'
import { getBatches, getExperiments, getExperimentsByBatchId, registerForBatch, registerForExperiment } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { useTrustVariation, PHASE_COMPLETED } from '../hooks/useTrustVariation'
import type { Match as OnChainMatch } from '../hooks/useTrustVariation'
import { truncateAddress } from '../utils/address'
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

export default function SubjectDashboard() {
  const { activeUser } = useActiveUser()
  const { activeAddress } = useAlgorand()
  const { listExperiments, listVariations } = useTrustExperiments()
  const { getPlayerMatch } = useTrustVariation()

  // Local BRET state
  const [experimentViews, setExperimentViews] = useState<SubjectExperimentView[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  // On-chain trust game state
  const [onChainMatches, setOnChainMatches] = useState<OnChainMatchView[]>([])
  const [onChainLoading, setOnChainLoading] = useState(true)

  // Wallet copy feedback
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void loadLocalExperiments()
    void loadOnChainMatches()
  }, [activeAddress])

  async function loadOnChainMatches() {
    if (!activeAddress) { setOnChainLoading(false); return }
    try {
      setOnChainLoading(true)
      const groups = await listExperiments()
      const views: OnChainMatchView[] = []
      for (const group of groups) {
        const vars = await listVariations(group.expId, Number(group.variationCount))
        for (const v of vars) {
          const match = await getPlayerMatch(v.appId, activeAddress)
          if (match) views.push({ appId: v.appId, match })
        }
      }
      setOnChainMatches(views)
    } catch (err) {
      console.error('Failed to load on-chain matches:', err)
    } finally {
      setOnChainLoading(false)
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

  function handleCopyAddress() {
    if (!activeAddress) return
    void navigator.clipboard.writeText(activeAddress).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const activeOnChain = onChainMatches.filter((v) => v.match.phase !== PHASE_COMPLETED)
  const completedOnChain = onChainMatches.filter((v) => v.match.phase === PHASE_COMPLETED)
  const availableViews = experimentViews.filter((view) => !hasCompletedMatch(view))
  const completedViews = experimentViews.filter((view) => hasCompletedMatch(view))

  const isLoading = localLoading || onChainLoading

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subject Dashboard</h1>
        <p className="text-base-content/70 mt-2">View and participate in experiments</p>
      </div>

      {/* Wallet address card — share with experimenter to be added as subject */}
      {activeAddress && (
        <div className="card bg-base-200 border border-base-300 mb-6">
          <div className="card-body py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium">Your Wallet Address</p>
                <p className="text-xs text-base-content/60 mt-1">Share this with the experimenter to be added to a Trust Game</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-base-100 px-2 py-1 rounded">{truncateAddress(activeAddress)}</code>
                <button type="button" className="btn btn-xs btn-outline" onClick={handleCopyAddress}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Active Trust Game matches ── */}
          {activeOnChain.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Active</h2>
              <div className="grid gap-4">
                {activeOnChain.map(({ appId, match }) => (
                  <div key={String(appId)} className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="card-title">Trust Game</h3>
                          <p className="text-sm text-base-content/70">Variation #{String(appId)}</p>
                          <p className="text-xs text-base-content/50 mt-1">
                            Role: <span className="font-medium">{match.investor === activeAddress ? 'Investor' : 'Trustee'}</span>
                            {' · '}
                            E1: {microAlgoToAlgo(match.investment > 0n ? match.investment : 0n).toLocaleString()} ALGO
                          </p>
                        </div>
                        <span className="badge badge-warning">In Progress</span>
                      </div>
                      <div className="card-actions justify-end mt-2">
                        <Link to={`/play/${String(appId)}`} className="btn btn-success btn-sm">
                          Play
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
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
                          <p className="text-sm text-base-content/70">Variation #{String(appId)}</p>
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

          {/* No trust matches yet */}
          {activeOnChain.length === 0 && completedOnChain.length === 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game</h2>
              <div className="text-center py-8 text-base-content/70 bg-base-200 rounded-lg">
                <p>No Trust Game matches yet.</p>
                <p className="text-sm mt-2">Copy your wallet address above and share it with an experimenter to be added.</p>
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

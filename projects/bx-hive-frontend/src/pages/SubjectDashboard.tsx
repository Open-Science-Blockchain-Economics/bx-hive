import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ExperimentCard from '../components/subject/ExperimentCard'
import ActiveMatchCard from '../components/subject/ActiveMatchCard'
import CompletedMatchCard from '../components/subject/CompletedMatchCard'
import EnrolledWaitingCard from '../components/subject/EnrolledWaitingCard'
import JoinableExperimentCard from '../components/subject/JoinableExperimentCard'
import { LoadingSpinner } from '../components/ui'
import { getBatches, getExperiments, getExperimentsByBatchId, registerForBatch, registerForExperiment } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation, PHASE_COMPLETED } from '../hooks/useTrustVariation'
import type { Match as OnChainMatch } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import { pickVariationRoundRobin, type VariationSlot } from '../utils/distributeSubjects'
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
  enrolled: boolean
  hasMatch: boolean
}

interface OnChainData {
  matchViews: OnChainMatchView[]
  expViews: OnChainExperimentView[]
}

export default function SubjectDashboard() {
  const { activeUser } = useActiveUser()
  const { activeAddress } = useAlgorand()
  const { listExperiments, listVariations } = useTrustExperiments()
  const { getPlayerMatch, selfEnroll, getSubjectCount, isSubjectEnrolled } = useTrustVariation()
  const queryClient = useQueryClient()

  const { data: onChainData, isLoading: onChainLoading } = useQuery<OnChainData>({
    queryKey: queryKeys.subjectOnChain(activeAddress ?? ''),
    queryFn: async () => {
      const groups = await listExperiments()
      const matchViews: OnChainMatchView[] = []
      const expViews: OnChainExperimentView[] = []

      for (const group of groups) {
        const vars = await listVariations(group.expId, Number(group.variationCount))
        let enrolled = false
        let hasMatch = false

        for (const v of vars) {
          const match = await getPlayerMatch(v.appId, activeAddress!)
          if (match) {
            matchViews.push({ appId: v.appId, match })
            enrolled = true
            hasMatch = true
          }
        }

        if (!enrolled) {
          for (const v of vars) {
            try {
              if (await isSubjectEnrolled(v.appId, activeAddress!)) {
                enrolled = true
                break
              }
            } catch {
              /* ignore */
            }
          }
        }

        expViews.push({ group, variations: vars, enrolled, hasMatch })
      }

      return { matchViews, expViews }
    },
    enabled: !!activeAddress,
  })

  const { data: localData, isLoading: localLoading } = useQuery<SubjectExperimentView[]>({
    queryKey: queryKeys.subjectLocal(activeUser?.id ?? ''),
    queryFn: async () => {
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
            if (exp.players.some((p) => p.userId === activeUser.id)) {
              userExperimentId = exp.id
              break
            }
          }
        }
        const representative: Experiment = {
          ...batchExperiments[0],
          players: batchExperiments.flatMap((e) => e.players),
          matches: batchExperiments.flatMap((e) => e.matches),
        }
        views.push({
          id: batch.id,
          isBatch: true,
          experiment: representative,
          totalPlayers,
          displayParameters: (batch as ExperimentBatch).baseParameters,
          userExperimentId,
        })
      }

      return views
    },
    enabled: true,
  })

  const joinMutation = useMutation({
    mutationFn: async ({ variations }: { expId: number; variations: VariationInfo[] }) => {
      const slots: VariationSlot[] = await Promise.all(
        variations.map(async (v) => {
          const count = await getSubjectCount(v.appId)
          return { appId: v.appId, subjectCount: count, maxSubjects: 0 }
        }),
      )
      const chosenAppId = pickVariationRoundRobin(slots)
      if (!chosenAppId) throw new Error('All variations are full')
      await selfEnroll(chosenAppId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subjectOnChain(activeAddress ?? '') })
    },
  })

  const registerMutation = useMutation({
    mutationFn: async ({ view, playerCount }: { view: SubjectExperimentView; playerCount: 1 | 2 }) => {
      if (!activeUser) return
      if (view.isBatch) {
        await registerForBatch(view.id, activeUser.id, playerCount)
      } else {
        await registerForExperiment(view.id, activeUser.id, playerCount)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subjectLocal(activeUser?.id ?? '') })
    },
  })

  function getJoinError(expId: number): string | null {
    if (!joinMutation.isError || joinMutation.variables?.expId !== expId) return null
    const msg = joinMutation.error?.message ?? 'Failed to join experiment'
    if (msg.includes('Already enrolled')) return 'You are already enrolled in this experiment'
    if (msg.includes('User not found')) return 'Please register your account first (Sign Up page)'
    return msg
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

  const onChainMatches = onChainData?.matchViews ?? []
  const onChainExperiments = onChainData?.expViews ?? []
  const experimentViews = localData ?? []

  const activeOnChain = onChainMatches.filter((v) => v.match.phase !== PHASE_COMPLETED)
  const completedOnChain = onChainMatches.filter((v) => v.match.phase === PHASE_COMPLETED)
  const joinableExperiments = onChainExperiments.filter((e) => !e.enrolled && !e.hasMatch)
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
        <LoadingSpinner />
      ) : (
        <div className="space-y-8">
          {/* Trust Game: Available to Join */}
          {joinableExperiments.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Available</h2>
              <div className="grid gap-4">
                {joinableExperiments.map(({ group, variations }) => (
                  <JoinableExperimentCard
                    key={group.expId}
                    group={group}
                    variations={variations}
                    joining={joinMutation.isPending ? joinMutation.variables?.expId ?? null : null}
                    joinError={getJoinError(group.expId)}
                    onJoin={(expId, vars) => joinMutation.mutate({ expId, variations: vars })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Trust Game: Enrolled, waiting */}
          {enrolledWaiting.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Enrolled</h2>
              <div className="grid gap-4">
                {enrolledWaiting.map(({ group }) => (
                  <EnrolledWaitingCard key={group.expId} group={group} />
                ))}
              </div>
            </section>
          )}

          {/* Active Trust Game matches */}
          {activeOnChain.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Active</h2>
              <div className="grid gap-4">
                {activeOnChain.map(({ appId, match }) => (
                  <ActiveMatchCard key={String(appId)} appId={appId} match={match} activeAddress={activeAddress!} />
                ))}
              </div>
            </section>
          )}

          {/* Completed Trust Game matches */}
          {completedOnChain.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Trust Game — Completed</h2>
              <div className="grid gap-4">
                {completedOnChain.map(({ appId, match }) => (
                  <CompletedMatchCard key={String(appId)} appId={appId} match={match} activeAddress={activeAddress!} />
                ))}
              </div>
            </section>
          )}

          {/* No trust activity */}
          {joinableExperiments.length === 0 &&
            enrolledWaiting.length === 0 &&
            activeOnChain.length === 0 &&
            completedOnChain.length === 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4">Trust Game</h2>
                <div className="text-center py-8 text-base-content/70 bg-base-200 rounded-lg">
                  <p>No Trust Game experiments available yet.</p>
                </div>
              </section>
            )}

          {/* BRET experiments */}
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
                        isRegistering={registerMutation.isPending && registerMutation.variables?.view.id === view.id}
                        onRegister={(playerCount) => registerMutation.mutate({ view, playerCount })}
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
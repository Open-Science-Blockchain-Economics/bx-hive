import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadingSpinner } from '../components/ui'
import ActiveMatchCard from '../components/subject/ActiveMatchCard'
import CompletedMatchCard from '../components/subject/CompletedMatchCard'
import EnrolledWaitingCard from '../components/subject/EnrolledWaitingCard'
import JoinableExperimentCard from '../components/subject/JoinableExperimentCard'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation, PHASE_COMPLETED, PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION } from '../hooks/useTrustVariation'
import type { Match as OnChainMatch } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import { pickVariationRoundRobin, type VariationSlot } from '../utils/distributeSubjects'

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
  const { activeAddress } = useAlgorand()
  const { listExperiments, listVariations } = useTrustExperiments()
  const { getPlayerMatch, selfEnroll, getSubjectCount, isSubjectEnrolled } = useTrustVariation()
  const queryClient = useQueryClient()

  const { data: onChainData } = useQuery<OnChainData>({
    queryKey: queryKeys.subjectOnChain(activeAddress!),
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
    refetchInterval: (query) => {
      const d = query.state.data
      if (!d) return false
      const hasEnrolledWaiting = d.expViews.some((e) => e.enrolled && !e.hasMatch)
      const hasWaitingMatch = d.matchViews.some(({ match }) => {
        if (match.phase === PHASE_COMPLETED) return false
        const isInvestor = match.investor === activeAddress
        const isTrustee = match.trustee === activeAddress
        return (isInvestor && match.phase === PHASE_TRUSTEE_DECISION) || (isTrustee && match.phase === PHASE_INVESTOR_DECISION)
      })
      return hasEnrolledWaiting || hasWaitingMatch ? 5000 : false
    },
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

  if (!onChainData) {
    return <LoadingSpinner />
  }

  function getJoinError(expId: number): string | null {
    if (!joinMutation.isError || joinMutation.variables?.expId !== expId) return null
    const msg = joinMutation.error?.message ?? 'Failed to join experiment'
    if (msg.includes('Already enrolled')) return 'You are already enrolled in this experiment'
    if (msg.includes('User not found')) return 'Please register your account first (Sign Up page)'
    return msg
  }

  const onChainMatches = onChainData.matchViews
  const onChainExperiments = onChainData.expViews

  const activeOnChain = onChainMatches.filter((v) => v.match.phase !== PHASE_COMPLETED)
  const completedOnChain = onChainMatches.filter((v) => v.match.phase === PHASE_COMPLETED)
  const joinableExperiments = onChainExperiments.filter((e) => !e.enrolled && !e.hasMatch)
  const enrolledWaiting = onChainExperiments.filter((e) => e.enrolled && !e.hasMatch)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subject Dashboard</h1>
        <p className="text-base-content/70 mt-2">View and participate in experiments</p>
      </div>

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
                  joining={joinMutation.isPending ? (joinMutation.variables?.expId ?? null) : null}
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
      </div>
    </div>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Panel } from '@/components/ds/card'
import { Rule } from '@/components/ds/separator'
import { LoadingSpinner } from '../components/ui'
import ActiveMatchCard from '../components/participant/ActiveMatchCard'
import CompletedMatchCard from '../components/participant/CompletedMatchCard'
import EnrolledWaitingCard from '../components/participant/EnrolledWaitingCard'
import JoinableExperimentCard from '../components/participant/JoinableExperimentCard'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation, PHASE_COMPLETED, PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION } from '../hooks/useTrustVariation'
import type { Match as OnChainMatch } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import { pickVariationRoundRobin, type VariationSlot } from '../utils/distributeParticipants'

interface OnChainMatchView {
  appId: bigint
  match: OnChainMatch
}

interface OnChainExperimentView {
  group: ExperimentGroup
  variations: VariationInfo[]
  slots: VariationSlot[]
  isFull: boolean
  enrolled: boolean
  hasMatch: boolean
}

interface OnChainData {
  matchViews: OnChainMatchView[]
  expViews: OnChainExperimentView[]
}

export default function ParticipantDashboard() {
  const { activeAddress } = useAlgorand()
  const { listExperiments, listVariations } = useTrustExperiments()
  const { getPlayerMatch, selfEnroll, getParticipantCount, getConfig, isParticipantEnrolled } = useTrustVariation()
  const queryClient = useQueryClient()

  const { data: onChainData } = useQuery<OnChainData>({
    queryKey: queryKeys.participantOnChain(activeAddress!),
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
              if (await isParticipantEnrolled(v.appId, activeAddress!)) {
                enrolled = true
                break
              }
            } catch {
              /* ignore */
            }
          }
        }

        const slots: VariationSlot[] = await Promise.all(
          vars.map(async (v) => {
            const [count, config] = await Promise.all([getParticipantCount(v.appId), getConfig(v.appId)])
            return {
              appId: v.appId,
              participantCount: count,
              maxParticipants: Number(config.maxParticipants),
            }
          }),
        )
        const isFull = pickVariationRoundRobin(slots) === null

        expViews.push({ group, variations: vars, slots, isFull, enrolled, hasMatch })
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
    mutationFn: async ({ slots }: { expId: number; slots: VariationSlot[] }) => {
      const chosenAppId = pickVariationRoundRobin(slots)
      if (!chosenAppId) throw new Error('All variations are full')
      await selfEnroll(chosenAppId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.participantOnChain(activeAddress ?? '') })
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
    if (msg.includes('Full')) return 'This experiment just filled up — please refresh.'
    return msg
  }

  const onChainMatches = onChainData.matchViews
  const onChainExperiments = onChainData.expViews

  const activeOnChain = onChainMatches.filter((v) => v.match.phase !== PHASE_COMPLETED)
  const completedOnChain = onChainMatches.filter((v) => v.match.phase === PHASE_COMPLETED)
  const joinableExperiments = onChainExperiments.filter((e) => !e.enrolled && !e.hasMatch)
  const enrolledWaiting = onChainExperiments.filter((e) => e.enrolled && !e.hasMatch)

  const hasAnything =
    joinableExperiments.length > 0 || enrolledWaiting.length > 0 || activeOnChain.length > 0 || completedOnChain.length > 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="t-h1">Participant Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">View and participate in experiments</p>
      </div>

      <div className="flex flex-col gap-8">
        {joinableExperiments.length > 0 && (
          <section>
            <Rule label="Trust Game — Available" className="mb-4" />
            <div className="grid gap-3">
              {joinableExperiments.map(({ group, variations, slots, isFull }) => (
                <JoinableExperimentCard
                  key={group.expId}
                  group={group}
                  variations={variations}
                  isFull={isFull}
                  joining={joinMutation.isPending ? (joinMutation.variables?.expId ?? null) : null}
                  joinError={getJoinError(group.expId)}
                  onJoin={(expId) => joinMutation.mutate({ expId, slots })}
                />
              ))}
            </div>
          </section>
        )}

        {enrolledWaiting.length > 0 && (
          <section>
            <Rule label="Trust Game — Enrolled" className="mb-4" />
            <div className="grid gap-3">
              {enrolledWaiting.map(({ group }) => (
                <EnrolledWaitingCard key={group.expId} group={group} />
              ))}
            </div>
          </section>
        )}

        {activeOnChain.length > 0 && (
          <section>
            <Rule label="Trust Game — Active" className="mb-4" />
            <div className="grid gap-3">
              {activeOnChain.map(({ appId, match }) => (
                <ActiveMatchCard key={String(appId)} appId={appId} match={match} activeAddress={activeAddress!} />
              ))}
            </div>
          </section>
        )}

        {completedOnChain.length > 0 && (
          <section>
            <Rule label="Trust Game — Completed" className="mb-4" />
            <div className="grid gap-3">
              {completedOnChain.map(({ appId, match }) => (
                <CompletedMatchCard key={String(appId)} appId={appId} match={match} activeAddress={activeAddress!} />
              ))}
            </div>
          </section>
        )}

        {!hasAnything && (
          <section>
            <Rule label="Trust Game" className="mb-4" />
            <Panel className="text-center py-10 text-muted-foreground">
              <p className="t-small">No Trust Game experiments available yet.</p>
            </Panel>
          </section>
        )}
      </div>
    </div>
  )
}

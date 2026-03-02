import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import BRETExperiment from '../components/experiment-types/bret/BRETExperiment'
import TrustExperiment from '../components/experiment-types/trust/TrustExperiment'
import { getExperimentById } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustVariation } from '../hooks/useTrustVariation'
import type { VariationConfig } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import type { Match as LocalMatch } from '../types'

/** Returns true if the param looks like a numeric on-chain app ID */
function isOnChainId(id: string): boolean {
  return /^\d+$/.test(id)
}

// ── On-chain Trust Game view ─────────────────────────────────────────────────

function OnChainTrustGame({ appId, activeAddress }: { appId: bigint; activeAddress: string }) {
  const { getPlayerMatch, getConfig } = useTrustVariation()

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.playerMatch(appId, activeAddress),
    queryFn: async () => {
      const [match, config] = await Promise.all([getPlayerMatch(appId, activeAddress), getConfig(appId)])
      if (!match) throw new Error('You are not matched in this variation yet.')
      return { match, config } as { match: NonNullable<Awaited<ReturnType<typeof getPlayerMatch>>>; config: VariationConfig }
    },
    refetchInterval: 3000,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load match data' : null

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-error">{error || 'Something went wrong'}</p>
        <Link to="/dashboard/subject" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard/subject" className="btn btn-ghost btn-sm mb-4">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Trust Game</h1>
        <p className="text-base-content/70 mt-1">Variation #{String(appId)}</p>
      </div>
      <TrustExperiment appId={appId} match={data.match} config={data.config} activeAddress={activeAddress} onRefresh={() => void refetch()} />
    </div>
  )
}

// ── Local (BRET) view ────────────────────────────────────────────────────────

function LocalExperiment({ experimentId, activeUser }: { experimentId: string; activeUser: { id: string } }) {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.localExperiment(experimentId),
    queryFn: async () => {
      const experiment = await getExperimentById(experimentId)
      if (!experiment) throw new Error('Experiment not found')
      const match = experiment.matches.find((m) => m.player1Id === activeUser.id || m.player2Id === activeUser.id)
      if (!match) throw new Error('You are not in a match for this experiment')
      return { experiment, match } as { experiment: NonNullable<typeof experiment>; match: LocalMatch }
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load experiment' : null

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-error">{error || 'Something went wrong'}</p>
        <Link to="/dashboard/subject" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard/subject" className="btn btn-ghost btn-sm mb-4">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">{data.experiment.name}</h1>
      </div>
      <BRETExperiment
        experiment={data.experiment}
        match={data.match}
        activeUserId={activeUser.id}
        onExperimentUpdate={() => void refetch()}
      />
    </div>
  )
}

// ── Route component ──────────────────────────────────────────────────────────

export default function PlayExperiment() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const { activeUser } = useActiveUser()
  const { activeAddress } = useAlgorand()

  if (!experimentId) {
    return <div className="text-center py-12 text-error">Missing experiment ID</div>
  }

  if (!activeUser || !activeAddress) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/70">Connect your wallet to play.</p>
        <Link to="/" className="btn btn-primary mt-4">
          Go Home
        </Link>
      </div>
    )
  }

  if (isOnChainId(experimentId)) {
    return <OnChainTrustGame appId={BigInt(experimentId)} activeAddress={activeAddress} />
  }

  return <LocalExperiment experimentId={experimentId} activeUser={activeUser} />
}
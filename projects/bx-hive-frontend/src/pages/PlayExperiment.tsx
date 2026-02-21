import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BRETExperiment from '../components/experiment-types/bret/BRETExperiment'
import TrustExperiment from '../components/experiment-types/trust/TrustExperiment'
import { getExperimentById } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustVariation } from '../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../hooks/useTrustVariation'
import type { Experiment, Match as LocalMatch } from '../types'

/** Returns true if the param looks like a numeric on-chain app ID */
function isOnChainId(id: string): boolean {
  return /^\d+$/.test(id)
}

// ── On-chain Trust Game view ─────────────────────────────────────────────────

function OnChainTrustGame({ appId, activeAddress }: { appId: bigint; activeAddress: string }) {
  const { getPlayerMatch, getConfig } = useTrustVariation()
  const [match, setMatch] = useState<Match | null>(null)
  const [config, setConfig] = useState<VariationConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([getPlayerMatch(appId, activeAddress), getConfig(appId)])
      if (!m) {
        setError('You are not matched in this variation yet.')
        return
      }
      setMatch(m)
      setConfig(c)
      setError(null)
    } catch (err) {
      console.error('Failed to load on-chain match:', err)
      setError('Failed to load match data')
    } finally {
      setLoading(false)
    }
  }, [appId, activeAddress, getPlayerMatch, getConfig])

  // Initial load + 3-second polling for phase changes
  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), 3000)
    return () => clearInterval(interval)
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (error || !match || !config) {
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
      <TrustExperiment appId={appId} match={match} config={config} activeAddress={activeAddress} onRefresh={() => void load()} />
    </div>
  )
}

// ── Local (BRET) view ────────────────────────────────────────────────────────

function LocalExperiment({ experimentId, activeUser }: { experimentId: string; activeUser: { id: string } }) {
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [match, setMatch] = useState<LocalMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const data = await getExperimentById(experimentId)
      if (!data) { setError('Experiment not found'); return }
      setExperiment(data)
      const userMatch = data.matches.find((m) => m.player1Id === activeUser.id || m.player2Id === activeUser.id)
      if (!userMatch) { setError('You are not in a match for this experiment'); return }
      setMatch(userMatch)
    } catch {
      setError('Failed to load experiment')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [experimentId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (error || !experiment || !match) {
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
        <h1 className="text-2xl font-bold">{experiment.name}</h1>
      </div>
      <BRETExperiment experiment={experiment} match={match} activeUserId={activeUser.id} onExperimentUpdate={() => void load()} />
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
        <Link to="/" className="btn btn-primary mt-4">Go Home</Link>
      </div>
    )
  }

  if (isOnChainId(experimentId)) {
    return <OnChainTrustGame appId={BigInt(experimentId)} activeAddress={activeAddress} />
  }

  return <LocalExperiment experimentId={experimentId} activeUser={activeUser} />
}
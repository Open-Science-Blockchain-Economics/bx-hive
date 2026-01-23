import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BRETExperiment from '../components/experiment-types/bret/BRETExperiment'
import TrustExperiment from '../components/experiment-types/trust/TrustExperiment'
import { getExperimentById, getUserById } from '../db'
import { getTemplateById } from '../experiment-logic/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Experiment, Match, User } from '../types'

// Experiment component registry
const EXPERIMENT_COMPONENTS = {
  'trust-game': TrustExperiment,
  bret: BRETExperiment,
} as const

export default function PlayExperiment() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const { activeUser } = useActiveUser()
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [partner, setPartner] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (experimentId && activeUser) {
      loadExperiment()
    }
  }, [experimentId, activeUser])

  async function loadExperiment() {
    if (!experimentId || !activeUser) return

    try {
      setLoading(true)
      setError(null)

      const experimentData = await getExperimentById(experimentId)
      if (!experimentData) {
        setError('Experiment not found')
        return
      }
      setExperiment(experimentData)

      // Find the user's match
      const userMatch = experimentData.matches.find((m) => m.player1Id === activeUser.id || m.player2Id === activeUser.id)
      if (!userMatch) {
        setError('You are not in a match for this experiment')
        return
      }
      setMatch(userMatch)

      // For 2-player experiments, load partner info
      const template = getTemplateById(experimentData.templateId)
      if (template?.playerCount === 2 && userMatch.player2Id) {
        const partnerId = userMatch.player1Id === activeUser.id ? userMatch.player2Id : userMatch.player1Id
        const partnerData = await getUserById(partnerId)
        setPartner(partnerData || null)
      }
    } catch (err) {
      console.error('Failed to load experiment:', err)
      setError('Failed to load experiment')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (error || !experiment || !match || !activeUser) {
    return (
      <div className="text-center py-12">
        <p className="text-error">{error || 'Something went wrong'}</p>
        <Link to="/dashboard/subject" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const template = getTemplateById(experiment.templateId)
  const ExperimentComponent = EXPERIMENT_COMPONENTS[experiment.templateId as keyof typeof EXPERIMENT_COMPONENTS]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard/subject" className="btn btn-ghost btn-sm mb-4">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">{experiment.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-base-content/70">{template?.label || template?.name || experiment.templateId}</span>
        </div>
        {partner && <p className="text-sm text-base-content/50 mt-1">Playing with: {partner.name}</p>}
      </div>

      {/* Experiment Component or Fallback */}
      {ExperimentComponent ? (
        <ExperimentComponent experiment={experiment} match={match} activeUserId={activeUser.id} onExperimentUpdate={loadExperiment} />
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center py-8 text-base-content/60">
            <p className="text-lg">Experiment type not implemented</p>
            <p className="text-sm mt-2">The experiment "{template?.label || experiment.templateId}" is not yet available.</p>
          </div>
        </div>
      )}
    </div>
  )
}
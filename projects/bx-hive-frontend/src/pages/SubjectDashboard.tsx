import { useEffect, useState } from 'react'
import ExperimentCard from '../components/subject/ExperimentCard'
import { getBatches, getExperiments, getExperimentsByBatchId, registerForBatch, registerForExperiment } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Experiment, ExperimentBatch } from '../types'

// Unified view for displaying experiments to subjects
interface SubjectExperimentView {
  id: string
  isBatch: boolean
  experiment: Experiment // For batches, this is a "representative" experiment
  totalPlayers: number
  displayParameters: Record<string, number | string>
  // If user is registered in a batch, track which specific experiment
  userExperimentId?: string
}

export default function SubjectDashboard() {
  const { activeUser } = useActiveUser()
  const [experimentViews, setExperimentViews] = useState<SubjectExperimentView[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    loadExperiments()
  }, [])

  async function loadExperiments() {
    try {
      setLoading(true)
      const allExperiments = await getExperiments()
      const allBatches = await getBatches()

      const views: SubjectExperimentView[] = []

      // Add standalone experiments (not part of a batch)
      const standaloneExperiments = allExperiments.filter((exp) => !exp.batchId && exp.status === 'active')
      for (const exp of standaloneExperiments) {
        views.push({
          id: exp.id,
          isBatch: false,
          experiment: exp,
          totalPlayers: exp.players.length,
          displayParameters: exp.parameters,
        })
      }

      // Add batches as single entries
      for (const batch of allBatches) {
        if (batch.status !== 'active') continue

        const batchExperiments = await getExperimentsByBatchId(batch.id)
        if (batchExperiments.length === 0) continue

        // Aggregate player count across all variations
        const totalPlayers = batchExperiments.reduce((sum, exp) => sum + exp.players.length, 0)

        // Find if user is registered in any variation
        let userExperimentId: string | undefined
        if (activeUser) {
          for (const exp of batchExperiments) {
            if (exp.players.some((p) => p.userId === activeUser.id)) {
              userExperimentId = exp.id
              break
            }
          }
        }

        // Use first experiment as representative (they all have same name, template, etc.)
        // But override parameters with base parameters (hide variations)
        const representative = batchExperiments[0]
        const representativeWithBaseParams: Experiment = {
          ...representative,
          players: batchExperiments.flatMap((e) => e.players), // Aggregate players for checking
          matches: batchExperiments.flatMap((e) => e.matches), // Aggregate matches for checking
        }

        views.push({
          id: batch.id,
          isBatch: true,
          experiment: representativeWithBaseParams,
          totalPlayers,
          displayParameters: batch.baseParameters,
          userExperimentId,
        })
      }

      setExperimentViews(views)
    } catch (err) {
      console.error('Failed to load experiments:', err)
    } finally {
      setLoading(false)
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
      await loadExperiments()
    } catch (err) {
      console.error('Failed to register:', err)
    } finally {
      setRegistering(null)
    }
  }

  // Split views into available and completed
  const availableViews = experimentViews.filter((view) => !hasCompletedMatch(view))
  const completedViews = experimentViews.filter((view) => hasCompletedMatch(view))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subject Dashboard</h1>
        <p className="text-base-content/70 mt-2">View and register for available experiments</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Available Experiments Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Available Experiments</h2>
            {availableViews.length === 0 ? (
              <div className="text-center py-8 text-base-content/70 bg-base-200 rounded-lg">
                <p>No experiments available at the moment.</p>
                <p className="text-sm mt-2">Check back later for new experiments.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableViews.map((view) => (
                  <ExperimentCard
                    key={view.id}
                    experiment={view.experiment}
                    isCompleted={false}
                    isRegistered={isRegistered(view)}
                    hasActiveMatch={hasActiveMatch(view)}
                    isRegistering={registering === view.id}
                    onRegister={(playerCount) => handleRegister(view, playerCount)}
                    isBatch={view.isBatch}
                    totalPlayers={view.totalPlayers}
                    playExperimentId={view.userExperimentId ?? view.experiment.id}
                    displayParameters={view.displayParameters}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Completed Experiments Section */}
          {completedViews.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Completed Experiments</h2>
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
        </div>
      )}
    </div>
  )
}

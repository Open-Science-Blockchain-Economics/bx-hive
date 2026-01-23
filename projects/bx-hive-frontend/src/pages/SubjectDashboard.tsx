import { useEffect, useState } from 'react'
import ExperimentCard from '../components/subject/ExperimentCard'
import { getExperiments, registerForExperiment } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Experiment } from '../types'

export default function SubjectDashboard() {
  const { activeUser } = useActiveUser()
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    loadExperiments()
  }, [])

  async function loadExperiments() {
    try {
      setLoading(true)
      const allExperiments = await getExperiments()
      const openExperiments = allExperiments.filter((experiment) => experiment.status === 'active')
      setExperiments(openExperiments)
    } catch (err) {
      console.error('Failed to load experiments:', err)
    } finally {
      setLoading(false)
    }
  }

  function isRegistered(experiment: Experiment): boolean {
    if (!activeUser) return false
    return experiment.players.some((p) => p.userId === activeUser.id)
  }

  function hasActiveMatch(experiment: Experiment): boolean {
    if (!activeUser) return false
    return experiment.matches.some((m) => (m.player1Id === activeUser.id || m.player2Id === activeUser.id) && m.status === 'playing')
  }

  function hasCompletedMatch(experiment: Experiment): boolean {
    if (!activeUser) return false
    return experiment.matches.some((m) => (m.player1Id === activeUser.id || m.player2Id === activeUser.id) && m.status === 'completed')
  }

  async function handleRegister(experimentId: string, playerCount: 1 | 2) {
    if (!activeUser) return

    try {
      setRegistering(experimentId)
      await registerForExperiment(experimentId, activeUser.id, playerCount)
      await loadExperiments()
    } catch (err) {
      console.error('Failed to register:', err)
    } finally {
      setRegistering(null)
    }
  }

  // Split experiments into available and completed
  const availableExperiments = experiments.filter((experiment) => !hasCompletedMatch(experiment))
  const completedExperiments = experiments.filter((experiment) => hasCompletedMatch(experiment))

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
            {availableExperiments.length === 0 ? (
              <div className="text-center py-8 text-base-content/70 bg-base-200 rounded-lg">
                <p>No experiments available at the moment.</p>
                <p className="text-sm mt-2">Check back later for new experiments.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableExperiments.map((experiment) => (
                  <ExperimentCard
                    key={experiment.id}
                    experiment={experiment}
                    isCompleted={false}
                    isRegistered={isRegistered(experiment)}
                    hasActiveMatch={hasActiveMatch(experiment)}
                    isRegistering={registering === experiment.id}
                    onRegister={(playerCount) => handleRegister(experiment.id, playerCount)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Completed Experiments Section */}
          {completedExperiments.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Completed Experiments</h2>
              <div className="grid gap-4">
                {completedExperiments.map((experiment) => (
                  <ExperimentCard
                    key={experiment.id}
                    experiment={experiment}
                    isCompleted={true}
                    isRegistered={true}
                    hasActiveMatch={false}
                    isRegistering={false}
                    onRegister={() => {}}
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

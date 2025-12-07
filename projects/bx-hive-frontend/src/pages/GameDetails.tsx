import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GAME_RESULTS_COMPONENTS } from '../components/experimenter/results'
import { closeGameRegistration, getGameById, getUsers, updateGameStatus } from '../db'
import { getTemplateById } from '../game/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Game, User } from '../types'

export default function GameDetails() {
  const { gameId } = useParams<{ gameId: string }>()
  const { activeUser } = useActiveUser()
  const [game, setGame] = useState<Game | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)

  useEffect(() => {
    if (gameId && activeUser) {
      loadGameData()
    }
  }, [gameId, activeUser])

  async function loadGameData() {
    if (!gameId) return

    try {
      setLoading(true)
      setError(null)

      const [gameData, allUsers] = await Promise.all([getGameById(gameId), getUsers()])

      if (!gameData) {
        setError('Game not found')
        return
      }

      setGame(gameData)
      setUsers(allUsers)
    } catch (err) {
      console.error('Failed to load game:', err)
      setError('Failed to load game data')
    } finally {
      setLoading(false)
    }
  }

  async function handleCloseRegistration() {
    if (!gameId) return

    try {
      setActionInProgress(true)
      await closeGameRegistration(gameId)
      await loadGameData()
    } catch (err) {
      console.error('Failed to close registration:', err)
      setError(err instanceof Error ? err.message : 'Failed to close registration')
    } finally {
      setActionInProgress(false)
    }
  }

  async function handleReopenRegistration() {
    if (!gameId) return

    try {
      setActionInProgress(true)
      await updateGameStatus(gameId, 'active')
      await loadGameData()
    } catch (err) {
      console.error('Failed to reopen registration:', err)
      setError(err instanceof Error ? err.message : 'Failed to reopen registration')
    } finally {
      setActionInProgress(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (error || !game || !activeUser) {
    return (
      <div className="text-center py-12">
        <p className="text-error">{error || 'Something went wrong'}</p>
        <Link to="/dashboard/experimenter" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const template = getTemplateById(game.templateId)
  const playingMatches = game.matches.filter((m) => m.status === 'playing')
  const completedMatches = game.matches.filter((m) => m.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/dashboard/experimenter" className="btn btn-ghost btn-sm mb-4">
          ← Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{game.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-base-content/70">{template?.label || template?.name || game.templateId}</span>
              <span className="text-base-content/50">•</span>
              <span className="text-sm text-base-content/50">Created {new Date(game.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`badge badge-lg ${
                game.status === 'active' ? 'badge-success' : game.status === 'closed' ? 'badge-warning' : 'badge-neutral'
              }`}
            >
              {game.status === 'active' && '🟢 Active'}
              {game.status === 'closed' && '🔒 Closed'}
              {game.status === 'completed' && '✓ Completed'}
            </span>
          </div>
        </div>
      </div>

      {/* Game Configuration */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title">Game Configuration</h2>
          <p className="text-sm text-base-content/60 mb-4">Parameters cannot be changed after game creation</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {template?.parameterSchema.map((param) => (
              <div key={param.name} className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-base-content/70">{param.label}</span>
                </label>
                <div className="p-3 bg-base-200 rounded-lg">
                  <span className="font-semibold">{game.parameters[param.name]}</span>
                </div>
                {param.description && (
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">{param.description}</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Game Management */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title">Game Management</h2>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Registration Status:</span>
                  <span className={`font-semibold ${game.status === 'active' ? 'text-success' : 'text-warning'}`}>
                    {game.status === 'active' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Total Players:</span>
                  <span className="font-semibold">{game.players.length}</span>
                </div>
                {template?.playerCount === 2 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Playing:</span>
                      <span className="font-semibold text-warning">{playingMatches.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Completed:</span>
                      <span className="font-semibold text-success">{completedMatches.length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {game.status === 'active' && (
                <button className="btn btn-warning" onClick={handleCloseRegistration} disabled={actionInProgress}>
                  {actionInProgress ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Closing...
                    </>
                  ) : (
                    <>🔒 Close Registration</>
                  )}
                </button>
              )}

              {game.status === 'closed' && (
                <button className="btn btn-success" onClick={handleReopenRegistration} disabled={actionInProgress}>
                  {actionInProgress ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Reopening...
                    </>
                  ) : (
                    <>🔓 Reopen Registration</>
                  )}
                </button>
              )}
            </div>
          </div>

          {game.status === 'active' && (
            <div className="alert alert-info mt-4">
              <span className="text-sm">
                Closing registration will prevent new players from joining. Existing players can still complete their matches.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Registered Players */}
      {game.players.length > 0 && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title">Registered Players ({game.players.length})</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {game.players.map((player) => {
                    const user = users.find((u) => u.id === player.userId)
                    return (
                      <tr key={player.userId}>
                        <td>{user?.name || 'Unknown'}</td>
                        <td>{new Date(player.registeredAt).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Game Results */}
      {game.matches.length > 0 &&
        (() => {
          const ResultsComponent = GAME_RESULTS_COMPONENTS[game.templateId as keyof typeof GAME_RESULTS_COMPONENTS]
          return ResultsComponent ? <ResultsComponent game={game} users={users} /> : null
        })()}
    </div>
  )
}

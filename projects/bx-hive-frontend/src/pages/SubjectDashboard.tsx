import { useEffect, useState } from 'react'
import { getGames, registerForGame } from '../db'
import { getTemplateById } from '../game/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Game } from '../types'

export default function SubjectDashboard() {
  const { activeUser } = useActiveUser()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    loadGames()
  }, [])

  async function loadGames() {
    try {
      setLoading(true)
      const allGames = await getGames()
      const openGames = allGames.filter((game) => game.status === 'open')
      setGames(openGames)
    } catch (err) {
      console.error('Failed to load games:', err)
    } finally {
      setLoading(false)
    }
  }

  function isRegistered(game: Game): boolean {
    if (!activeUser) return false
    return game.players.some((p) => p.userId === activeUser.id)
  }

  async function handleRegister(game: Game, playerCount: 1 | 2) {
    if (!activeUser) return

    try {
      setRegistering(game.id)
      await registerForGame(game.id, activeUser.id, playerCount)
      await loadGames()
    } catch (err) {
      console.error('Failed to register:', err)
    } finally {
      setRegistering(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subject Dashboard</h1>
        <p className="text-base-content/70 mt-2">View and register for available games</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-12 text-base-content/70">
          <p>No games available at the moment.</p>
          <p className="text-sm mt-2">Check back later for new games.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {games.map((game) => {
            const template = getTemplateById(game.templateId)
            const registered = isRegistered(game)

            return (
              <div key={game.id} className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="card-title">{game.name}</h3>
                      <p className="text-sm text-base-content/70">{template?.name || game.templateId}</p>
                    </div>
                    <div className="flex gap-2">
                      {registered && <span className="badge badge-success">Registered</span>}
                      <span className="badge badge-neutral">{template?.playerCount || '?'}-player</span>
                    </div>
                  </div>

                  <div className="text-sm mt-2">
                    <span className="text-base-content/70">Players registered: </span>
                    {game.players.length}
                  </div>

                  {template && (
                    <div className="text-xs text-base-content/60 mt-2">
                      {template.parameterSchema.map((param) => (
                        <span key={param.name} className="mr-4">
                          {param.label}: {game.parameters[param.name]}
                        </span>
                      ))}
                    </div>
                  )}

                  {!registered && template && (
                    <div className="card-actions justify-end mt-4">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRegister(game, template.playerCount)}
                        disabled={registering === game.id}
                      >
                        {registering === game.id ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Registering...
                          </>
                        ) : (
                          'Register'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import GameCard from '../components/subject/GameCard'
import { getGames, registerForGame } from '../db'
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
      const openGames = allGames.filter((game) => game.status === 'active')
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

  function hasActiveMatch(game: Game): boolean {
    if (!activeUser) return false
    return game.matches.some((m) => (m.player1Id === activeUser.id || m.player2Id === activeUser.id) && m.status === 'playing')
  }

  function hasCompletedMatch(game: Game): boolean {
    if (!activeUser) return false
    return game.matches.some((m) => (m.player1Id === activeUser.id || m.player2Id === activeUser.id) && m.status === 'completed')
  }

  async function handleRegister(gameId: string, playerCount: 1 | 2) {
    if (!activeUser) return

    try {
      setRegistering(gameId)
      await registerForGame(gameId, activeUser.id, playerCount)
      await loadGames()
    } catch (err) {
      console.error('Failed to register:', err)
    } finally {
      setRegistering(null)
    }
  }

  // Split games into available and completed
  const availableGames = games.filter((game) => !hasCompletedMatch(game))
  const completedGames = games.filter((game) => hasCompletedMatch(game))

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
      ) : (
        <div className="space-y-8">
          {/* Available Games Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Available Games</h2>
            {availableGames.length === 0 ? (
              <div className="text-center py-8 text-base-content/70 bg-base-200 rounded-lg">
                <p>No games available at the moment.</p>
                <p className="text-sm mt-2">Check back later for new games.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    isCompleted={false}
                    isRegistered={isRegistered(game)}
                    hasActiveMatch={hasActiveMatch(game)}
                    isRegistering={registering === game.id}
                    onRegister={(playerCount) => handleRegister(game.id, playerCount)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Completed Games Section */}
          {completedGames.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Completed Games</h2>
              <div className="grid gap-4">
                {completedGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
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

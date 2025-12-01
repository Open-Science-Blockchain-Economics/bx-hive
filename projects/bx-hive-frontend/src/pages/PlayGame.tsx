import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGameById, getUserById } from '../db'
import { getTemplateById } from '../game/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Game, Match, User } from '../types'

export default function PlayGame() {
  const { gameId } = useParams<{ gameId: string }>()
  const { activeUser } = useActiveUser()
  const [game, setGame] = useState<Game | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [partner, setPartner] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (gameId && activeUser) {
      loadGame()
    }
  }, [gameId, activeUser])

  async function loadGame() {
    if (!gameId || !activeUser) return

    try {
      setLoading(true)
      setError(null)

      const gameData = await getGameById(gameId)
      if (!gameData) {
        setError('Game not found')
        return
      }
      setGame(gameData)

      // Find the user's match
      const userMatch = gameData.matches.find(
        (m) => m.player1Id === activeUser.id || m.player2Id === activeUser.id
      )
      if (!userMatch) {
        setError('You are not in a match for this game')
        return
      }
      setMatch(userMatch)

      // For 2-player games, load partner info
      const template = getTemplateById(gameData.templateId)
      if (template?.playerCount === 2 && userMatch.player2Id) {
        const partnerId = userMatch.player1Id === activeUser.id ? userMatch.player2Id : userMatch.player1Id
        const partnerData = await getUserById(partnerId)
        setPartner(partnerData || null)
      }
    } catch (err) {
      console.error('Failed to load game:', err)
      setError('Failed to load game')
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

  if (error || !game || !match) {
    return (
      <div className="text-center py-12">
        <p className="text-error">{error || 'Something went wrong'}</p>
        <Link to="/dashboard/subject" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const template = getTemplateById(game.templateId)

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard/subject" className="btn btn-ghost btn-sm mb-4">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">{game.name}</h1>
        <p className="text-base-content/70 mt-1">{template?.name || game.templateId}</p>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title">Match Info</h2>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between">
              <span className="text-base-content/70">Status:</span>
              <span className={`badge ${match.status === 'playing' ? 'badge-success' : match.status === 'completed' ? 'badge-neutral' : 'badge-warning'}`}>
                {match.status}
              </span>
            </div>

            {template?.playerCount === 2 && (
              <div className="flex justify-between">
                <span className="text-base-content/70">Partner:</span>
                <span>{partner?.name || 'Unknown'}</span>
              </div>
            )}

            {template && (
              <div className="divider"></div>
            )}

            {template && (
              <div className="text-sm">
                <span className="font-medium">Game Parameters:</span>
                <div className="mt-2 space-y-1">
                  {template.parameterSchema.map((param) => (
                    <div key={param.name} className="flex justify-between text-base-content/70">
                      <span>{param.label}:</span>
                      <span>{game.parameters[param.name]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="divider"></div>

          <div className="text-center py-8 text-base-content/60">
            <p className="text-lg">Game play coming soon</p>
            <p className="text-sm mt-2">The {template?.name || 'game'} interface will be implemented here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BRETGame from '../components/game/bret/BRETGame'
import TrustGame from '../components/game/trust/TrustGame'
import { getGameById, getUserById } from '../db'
import { getTemplateById } from '../game/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Game, Match, User } from '../types'

// Game component registry
const GAME_COMPONENTS = {
  'trust-game': TrustGame,
  bret: BRETGame,
} as const

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
      const userMatch = gameData.matches.find((m) => m.player1Id === activeUser.id || m.player2Id === activeUser.id)
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

  if (error || !game || !match || !activeUser) {
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
  const GameComponent = GAME_COMPONENTS[game.templateId as keyof typeof GAME_COMPONENTS]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard/subject" className="btn btn-ghost btn-sm mb-4">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">{game.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-base-content/70">{template?.label || template?.name || game.templateId}</span>
        </div>
        {partner && <p className="text-sm text-base-content/50 mt-1">Playing with: {partner.name}</p>}
      </div>

      {/* Game Component or Fallback */}
      {GameComponent ? (
        <GameComponent game={game} match={match} activeUserId={activeUser.id} onGameUpdate={loadGame} />
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center py-8 text-base-content/60">
            <p className="text-lg">Game type not implemented</p>
            <p className="text-sm mt-2">The game "{template?.label || game.templateId}" is not yet available.</p>
          </div>
        </div>
      )}
    </div>
  )
}

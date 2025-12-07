import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGameById, getUserById } from '../db'
import { getTemplateById } from '../game/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import InvestorInterface from '../components/game/InvestorInterface'
import TrusteeInterface from '../components/game/TrusteeInterface'
import ResultsDisplay from '../components/game/ResultsDisplay'
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

  // Trust Game specific logic
  const isTrustGame = game.templateId === 'trust-game'
  const isInvestor = match.player1Id === activeUser.id
  const E1 = game.parameters.E1 as number
  const E2 = game.parameters.E2 as number
  const m = game.parameters.m as number
  const UNIT = game.parameters.UNIT as number

  function renderTrustGameUI() {
    if (!game || !match || !match.state) {
      return (
        <div className="text-center py-8 text-base-content/60">
          <p>Game state not initialized</p>
        </div>
      )
    }

    const { phase, investorDecision, trusteeDecision, investorPayout, trusteePayout } = match.state

    // Completed - show results
    if (phase === 'completed' && investorDecision !== undefined && trusteeDecision !== undefined && investorPayout !== undefined && trusteePayout !== undefined) {
      return (
        <ResultsDisplay
          E1={E1}
          E2={E2}
          m={m}
          investorDecision={investorDecision}
          trusteeDecision={trusteeDecision}
          investorPayout={investorPayout}
          trusteePayout={trusteePayout}
          isInvestor={isInvestor}
        />
      )
    }

    // Investor decision phase
    if (phase === 'investor_decision') {
      if (isInvestor) {
        return (
          <InvestorInterface
            gameId={game.id}
            matchId={match.id}
            E1={E1}
            m={m}
            UNIT={UNIT}
            onDecisionMade={loadGame}
          />
        )
      } else {
        return (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body text-center">
              <h2 className="card-title justify-center">Waiting for Investor</h2>
              <p className="text-base-content/70 mt-2">
                The Investor is deciding how much to send you.
              </p>
              <p className="text-sm text-base-content/50 mt-4">
                Refresh the page to check for updates.
              </p>
              <button className="btn btn-outline mt-4" onClick={loadGame}>
                Refresh
              </button>
            </div>
          </div>
        )
      }
    }

    // Trustee decision phase
    if (phase === 'trustee_decision' && investorDecision !== undefined) {
      if (!isInvestor) {
        return (
          <TrusteeInterface
            gameId={game.id}
            matchId={match.id}
            E1={E1}
            E2={E2}
            m={m}
            UNIT={UNIT}
            investorDecision={investorDecision}
            onDecisionMade={loadGame}
          />
        )
      } else {
        return (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body text-center">
              <h2 className="card-title justify-center">Waiting for Trustee</h2>
              <p className="text-base-content/70 mt-2">
                You invested <span className="font-bold">{investorDecision.toLocaleString()}</span>.
              </p>
              <p className="text-base-content/70">
                The Trustee received <span className="font-bold">{(investorDecision * m).toLocaleString()}</span> and is deciding how much to return.
              </p>
              <p className="text-sm text-base-content/50 mt-4">
                Refresh the page to check for updates.
              </p>
              <button className="btn btn-outline mt-4" onClick={loadGame}>
                Refresh
              </button>
            </div>
          </div>
        )
      }
    }

    return (
      <div className="text-center py-8 text-base-content/60">
        <p>Unknown game state</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard/subject" className="btn btn-ghost btn-sm mb-4">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">{game.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-base-content/70">{template?.name || game.templateId}</span>
          {isTrustGame && (
            <span className="badge badge-sm">
              You are the {isInvestor ? 'Investor' : 'Trustee'}
            </span>
          )}
        </div>
        {partner && (
          <p className="text-sm text-base-content/50 mt-1">
            Playing with: {partner.name}
          </p>
        )}
      </div>

      {isTrustGame ? (
        renderTrustGameUI()
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center py-8 text-base-content/60">
            <p className="text-lg">Game play coming soon</p>
            <p className="text-sm mt-2">The {template?.name || 'game'} interface will be implemented here.</p>
          </div>
        </div>
      )}
    </div>
  )
}
import type { BRETState, Game, Match } from '../../../types'
import BRETInterface from './BRETInterface'

interface BRETGameProps {
  game: Game
  match: Match
  activeUserId: string
  onGameUpdate: () => void
}

export default function BRETGame({ game, match, onGameUpdate }: BRETGameProps) {
  // Extract BRET parameters
  const rows = game.parameters.rows as number
  const cols = game.parameters.cols as number
  const paymentPerBox = game.parameters.paymentPerBox as number

  // Check if state is initialized
  if (!match.state) {
    return (
      <div className="text-center py-8 text-base-content/60">
        <p>Game state not initialized</p>
      </div>
    )
  }

  const state = match.state as BRETState

  return (
    <BRETInterface
      gameId={game.id}
      matchId={match.id}
      rows={rows}
      cols={cols}
      paymentPerBox={paymentPerBox}
      state={state}
      onDecisionMade={onGameUpdate}
    />
  )
}

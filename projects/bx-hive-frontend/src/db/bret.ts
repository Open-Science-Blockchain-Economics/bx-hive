import { processDecision, validateBoxesCollected } from '../game/bret'
import type { BRETState, Match } from '../types'
import { getGameById, updateGame } from './games'

export async function submitBRETDecision(gameId: string, matchId: string, boxesCollected: number): Promise<Match> {
  const game = await getGameById(gameId)
  if (!game) {
    throw new Error('Game not found')
  }

  const match = game.matches.find((m) => m.id === matchId)
  if (!match) {
    throw new Error('Match not found')
  }

  if (!match.state || (match.state as BRETState).phase !== 'decision') {
    throw new Error('Not in decision phase')
  }

  const rows = game.parameters.rows as number
  const cols = game.parameters.cols as number
  const paymentPerBox = game.parameters.paymentPerBox as number

  if (!validateBoxesCollected(boxesCollected, rows, cols)) {
    throw new Error('Invalid number of boxes')
  }

  const updatedState = processDecision(match.state as BRETState, boxesCollected, paymentPerBox)

  match.state = updatedState
  match.status = 'completed'

  await updateGame(game)
  return match
}

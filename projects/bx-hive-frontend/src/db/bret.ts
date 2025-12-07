import { processDecision } from '../game/bret'
import type { BRETState, Match } from '../types'
import { getGameById, updateGame } from './games'

export async function submitBRETDecision(gameId: string, matchId: string, selectedBoxes: number[]): Promise<Match> {
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
  const totalBoxes = rows * cols

  // Validate selected boxes
  if (selectedBoxes.length < 1 || selectedBoxes.length >= totalBoxes) {
    throw new Error('Invalid number of boxes selected')
  }

  // Validate all indices are within range and unique
  const uniqueBoxes = new Set(selectedBoxes)
  if (uniqueBoxes.size !== selectedBoxes.length) {
    throw new Error('Duplicate boxes selected')
  }

  for (const box of selectedBoxes) {
    if (box < 0 || box >= totalBoxes) {
      throw new Error(`Invalid box index: ${box}`)
    }
  }

  const updatedState = processDecision(match.state as BRETState, selectedBoxes, paymentPerBox)

  match.state = updatedState
  match.status = 'completed'

  await updateGame(game)
  return match
}

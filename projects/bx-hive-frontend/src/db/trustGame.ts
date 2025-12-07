import { calculatePayouts, validateInvestment, validateReturn } from '../game/trustGame'
import type { Match } from '../types'
import { getGameById, updateGame } from './games'

export async function submitInvestorDecision(gameId: string, matchId: string, investment: number): Promise<Match> {
  const game = await getGameById(gameId)
  if (!game) {
    throw new Error('Game not found')
  }

  const match = game.matches.find((m) => m.id === matchId)
  if (!match) {
    throw new Error('Match not found')
  }

  if (!match.state || match.state.phase !== 'investor_decision') {
    throw new Error('Not in investor decision phase')
  }

  const E1 = game.parameters.E1 as number
  const UNIT = game.parameters.UNIT as number

  if (!validateInvestment(investment, E1, UNIT)) {
    throw new Error('Invalid investment amount')
  }

  match.state = {
    ...match.state,
    phase: 'trustee_decision',
    investorDecision: investment,
  }

  await updateGame(game)
  return match
}

export async function submitTrusteeDecision(gameId: string, matchId: string, returnAmount: number): Promise<Match> {
  const game = await getGameById(gameId)
  if (!game) {
    throw new Error('Game not found')
  }

  const match = game.matches.find((m) => m.id === matchId)
  if (!match) {
    throw new Error('Match not found')
  }

  if (!match.state || match.state.phase !== 'trustee_decision') {
    throw new Error('Not in trustee decision phase')
  }

  const E1 = game.parameters.E1 as number
  const E2 = game.parameters.E2 as number
  const m = game.parameters.m as number
  const UNIT = game.parameters.UNIT as number
  const investment = match.state.investorDecision!
  const received = investment * m

  if (!validateReturn(returnAmount, received, UNIT)) {
    throw new Error('Invalid return amount')
  }

  const { investorPayout, trusteePayout } = calculatePayouts(E1, E2, m, investment, returnAmount)

  match.state = {
    ...match.state,
    phase: 'completed',
    trusteeDecision: returnAmount,
    investorPayout,
    trusteePayout,
  }
  match.status = 'completed'

  await updateGame(game)
  return match
}

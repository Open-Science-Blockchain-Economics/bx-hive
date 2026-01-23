import { calculatePayouts, validateInvestment, validateReturn } from '../experiment-logic/trustExperiment'
import type { Match } from '../types'
import { getExperimentById, updateExperiment } from './experiments'

export async function submitInvestorDecision(experimentId: string, matchId: string, investment: number): Promise<Match> {
  const experiment = await getExperimentById(experimentId)
  if (!experiment) {
    throw new Error('Experiment not found')
  }

  const match = experiment.matches.find((m) => m.id === matchId)
  if (!match) {
    throw new Error('Match not found')
  }

  if (!match.state || match.state.phase !== 'investor_decision') {
    throw new Error('Not in investor decision phase')
  }

  const E1 = experiment.parameters.E1 as number
  const UNIT = experiment.parameters.UNIT as number

  if (!validateInvestment(investment, E1, UNIT)) {
    throw new Error('Invalid investment amount')
  }

  match.state = {
    ...match.state,
    phase: 'trustee_decision',
    investorDecision: investment,
  }

  await updateExperiment(experiment)
  return match
}

export async function submitTrusteeDecision(experimentId: string, matchId: string, returnAmount: number): Promise<Match> {
  const experiment = await getExperimentById(experimentId)
  if (!experiment) {
    throw new Error('Experiment not found')
  }

  const match = experiment.matches.find((m) => m.id === matchId)
  if (!match) {
    throw new Error('Match not found')
  }

  if (!match.state || match.state.phase !== 'trustee_decision') {
    throw new Error('Not in trustee decision phase')
  }

  const E1 = experiment.parameters.E1 as number
  const E2 = experiment.parameters.E2 as number
  const m = experiment.parameters.m as number
  const UNIT = experiment.parameters.UNIT as number
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

  await updateExperiment(experiment)
  return match
}
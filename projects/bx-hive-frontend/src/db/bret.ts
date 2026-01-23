import { processDecision } from '../experiment-logic/bret'
import type { BRETState, Match } from '../types'
import { getExperimentById, updateExperiment } from './experiments'

export async function submitBRETDecision(experimentId: string, matchId: string, selectedBoxes: number[]): Promise<Match> {
  const experiment = await getExperimentById(experimentId)
  if (!experiment) {
    throw new Error('Experiment not found')
  }

  const match = experiment.matches.find((m) => m.id === matchId)
  if (!match) {
    throw new Error('Match not found')
  }

  if (!match.state || (match.state as BRETState).phase !== 'decision') {
    throw new Error('Not in decision phase')
  }

  const rows = experiment.parameters.rows as number
  const cols = experiment.parameters.cols as number
  const paymentPerBox = experiment.parameters.paymentPerBox as number
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

  await updateExperiment(experiment)
  return match
}

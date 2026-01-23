import { initializeBRETState } from '../experiment-logic/bret'
import type { Experiment, ExperimentStatus, TrustExperimentState } from '../types'
import { executeReadArrayTransaction, executeReadTransaction, executeWriteTransaction, STORES } from './index'

export async function createExperiment(
  templateId: string,
  experimenterId: string,
  name: string,
  parameters: Record<string, number | string>,
): Promise<Experiment> {
  const experiment: Experiment = {
    id: crypto.randomUUID(),
    templateId,
    experimenterId,
    name,
    parameters,
    status: 'active',
    createdAt: Date.now(),
    players: [],
    matches: [],
  }

  await executeWriteTransaction(STORES.EXPERIMENTS, (store) => store.add(experiment))
  return experiment
}

export async function getExperiments(): Promise<Experiment[]> {
  return executeReadArrayTransaction<Experiment>(STORES.EXPERIMENTS, (store) => store.getAll())
}

export async function getExperimentsByExperimenter(experimenterId: string): Promise<Experiment[]> {
  const allExperiments = await getExperiments()
  return allExperiments.filter((experiment) => experiment.experimenterId === experimenterId)
}

export async function getExperimentById(id: string): Promise<Experiment | undefined> {
  return executeReadTransaction<Experiment>(STORES.EXPERIMENTS, (store) => store.get(id))
}

export async function updateExperiment(experiment: Experiment): Promise<void> {
  await executeWriteTransaction(STORES.EXPERIMENTS, (store) => store.put(experiment))
}

export async function registerForExperiment(experimentId: string, userId: string, playerCount: 1 | 2): Promise<Experiment> {
  const experiment = await getExperimentById(experimentId)
  if (!experiment) {
    throw new Error('Experiment not found')
  }

  if (experiment.status !== 'active') {
    throw new Error('Registration is closed for this experiment')
  }

  if (experiment.players.some((p) => p.userId === userId)) {
    throw new Error('Already registered for this experiment')
  }

  experiment.players.push({
    userId,
    registeredAt: Date.now(),
  })

  // For 1-player experiments, create a match immediately
  if (playerCount === 1) {
    // Initialize experiment-specific state for single-player experiments
    const initialState =
      experiment.templateId === 'bret' ? initializeBRETState(experiment.parameters.rows as number, experiment.parameters.cols as number) : undefined

    experiment.matches.push({
      id: crypto.randomUUID(),
      player1Id: userId,
      status: 'playing',
      createdAt: Date.now(),
      state: initialState,
    })
  }

  // For 2-player experiments, use FIFO matching
  if (playerCount === 2) {
    // Find players who are not yet in any match
    const playersInMatches = new Set(experiment.matches.flatMap((m) => [m.player1Id, m.player2Id].filter(Boolean)))
    const waitingPlayers = experiment.players.filter((p) => p.userId !== userId && !playersInMatches.has(p.userId))

    if (waitingPlayers.length > 0) {
      // FIFO: pair with the earliest registered waiting player
      const partner = waitingPlayers.sort((a, b) => a.registeredAt - b.registeredAt)[0]

      // Initialize experiment-specific state for Trust Experiment
      const initialState: TrustExperimentState | undefined = experiment.templateId === 'trust-game' ? { phase: 'investor_decision' } : undefined

      experiment.matches.push({
        id: crypto.randomUUID(),
        player1Id: partner.userId,
        player2Id: userId,
        status: 'playing',
        createdAt: Date.now(),
        state: initialState,
      })
    }
  }

  await updateExperiment(experiment)
  return experiment
}

/**
 * Update experiment status
 * @param experimentId - Experiment ID
 * @param newStatus - New status to set
 * @returns Updated experiment
 */
export async function updateExperimentStatus(experimentId: string, newStatus: ExperimentStatus): Promise<Experiment> {
  const experiment = await getExperimentById(experimentId)
  if (!experiment) {
    throw new Error('Experiment not found')
  }

  experiment.status = newStatus
  await updateExperiment(experiment)
  return experiment
}

/**
 * Close registration for an experiment (sets status to 'closed')
 * Existing registered players can still complete their matches
 * @param experimentId - Experiment ID
 * @returns Updated experiment
 */
export async function closeExperimentRegistration(experimentId: string): Promise<Experiment> {
  return updateExperimentStatus(experimentId, 'closed')
}
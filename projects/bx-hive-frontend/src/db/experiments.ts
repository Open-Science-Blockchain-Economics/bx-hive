import { initializeBRETState } from '../experiment-logic/bret'
import type { AssignmentStrategy, Experiment, ExperimentBatch, ExperimentStatus, ParameterVariation, TrustExperimentState } from '../types'
import { executeReadArrayTransaction, executeReadTransaction, executeWriteTransaction, STORES } from './index'

// ==========================================
// Batch Operations
// ==========================================

/**
 * Generate all variation combinations using cartesian product (factorial design)
 */
function generateVariationCombinations(
  baseParams: Record<string, number | string>,
  variations: ParameterVariation[],
): Record<string, number | string>[] {
  if (variations.length === 0) {
    return [{ ...baseParams }]
  }

  // Start with base parameters
  let combinations: Record<string, number | string>[] = [{ ...baseParams }]

  // For each varied parameter, expand the combinations
  for (const variation of variations) {
    const newCombinations: Record<string, number | string>[] = []
    for (const combo of combinations) {
      for (const value of variation.values) {
        newCombinations.push({
          ...combo,
          [variation.parameterName]: value,
        })
      }
    }
    combinations = newCombinations
  }

  return combinations
}

/**
 * Generate a human-readable label for a variation
 */
export function getVariationLabel(params: Record<string, number | string>, variations: ParameterVariation[]): string {
  return variations.map((v) => `${v.parameterName}=${params[v.parameterName]}`).join(', ')
}

/**
 * Create a batch experiment with multiple variations
 */
export async function createExperimentBatch(
  templateId: string,
  experimenterId: string,
  name: string,
  baseParameters: Record<string, number | string>,
  variations: ParameterVariation[],
  assignmentStrategy: AssignmentStrategy,
  maxPerVariation?: number,
): Promise<ExperimentBatch> {
  // Generate all parameter combinations
  const paramCombinations = generateVariationCombinations(baseParameters, variations)

  // Create individual experiments for each variation
  const experimentIds: string[] = []

  for (let i = 0; i < paramCombinations.length; i++) {
    const params = paramCombinations[i]
    const experiment: Experiment = {
      id: crypto.randomUUID(),
      templateId,
      experimenterId,
      name, // Same name for all - participants see this
      parameters: params,
      status: 'active',
      createdAt: Date.now(),
      players: [],
      matches: [],
      batchId: '', // Will be set after batch is created
      variationIndex: i,
    }
    experimentIds.push(experiment.id)
    await executeWriteTransaction(STORES.EXPERIMENTS, (store) => store.add(experiment))
  }

  // Create the batch record
  const batch: ExperimentBatch = {
    id: crypto.randomUUID(),
    name,
    templateId,
    experimenterId,
    baseParameters,
    variations,
    assignmentStrategy,
    maxPerVariation,
    experimentIds,
    createdAt: Date.now(),
    status: 'active',
  }

  await executeWriteTransaction(STORES.BATCHES, (store) => store.add(batch))

  // Update experiments with the batch ID
  for (const expId of experimentIds) {
    const exp = await getExperimentById(expId)
    if (exp) {
      exp.batchId = batch.id
      await updateExperiment(exp)
    }
  }

  return batch
}

/**
 * Get all batches
 */
export async function getBatches(): Promise<ExperimentBatch[]> {
  return executeReadArrayTransaction<ExperimentBatch>(STORES.BATCHES, (store) => store.getAll())
}

/**
 * Get batches by experimenter
 */
export async function getBatchesByExperimenter(experimenterId: string): Promise<ExperimentBatch[]> {
  const allBatches = await getBatches()
  return allBatches.filter((batch) => batch.experimenterId === experimenterId)
}

/**
 * Get a batch by ID
 */
export async function getBatchById(id: string): Promise<ExperimentBatch | undefined> {
  return executeReadTransaction<ExperimentBatch>(STORES.BATCHES, (store) => store.get(id))
}

/**
 * Get all experiments belonging to a batch
 */
export async function getExperimentsByBatchId(batchId: string): Promise<Experiment[]> {
  const allExperiments = await getExperiments()
  return allExperiments.filter((exp) => exp.batchId === batchId).sort((a, b) => (a.variationIndex ?? 0) - (b.variationIndex ?? 0))
}

/**
 * Update a batch
 */
export async function updateBatch(batch: ExperimentBatch): Promise<void> {
  await executeWriteTransaction(STORES.BATCHES, (store) => store.put(batch))
}

/**
 * Register for a batch experiment - assigns participant to a variation based on strategy
 */
export async function registerForBatch(batchId: string, userId: string, playerCount: 1 | 2): Promise<Experiment> {
  const batch = await getBatchById(batchId)
  if (!batch) {
    throw new Error('Batch not found')
  }

  if (batch.status !== 'active') {
    throw new Error('Registration is closed for this experiment')
  }

  // Get all experiments in this batch
  const experiments = await getExperimentsByBatchId(batchId)

  // Check if user is already registered in any variation
  for (const exp of experiments) {
    if (exp.players.some((p) => p.userId === userId)) {
      throw new Error('Already registered for this experiment')
    }
  }

  // Filter to only active experiments that haven't reached capacity
  const availableExperiments = experiments.filter((exp) => {
    if (exp.status !== 'active') return false
    if (batch.maxPerVariation && exp.players.length >= batch.maxPerVariation) return false
    return true
  })

  if (availableExperiments.length === 0) {
    throw new Error('All variations are full or closed')
  }

  // Select experiment based on assignment strategy
  let selectedExperiment: Experiment

  if (batch.assignmentStrategy === 'round_robin') {
    // Pick the experiment with the fewest players
    selectedExperiment = availableExperiments.reduce((min, exp) => (exp.players.length < min.players.length ? exp : min), availableExperiments[0])
  } else {
    // fill_sequential: Pick the first available experiment (by variation index)
    selectedExperiment = availableExperiments[0]
  }

  // Register the player in the selected experiment
  const result = await registerForExperiment(selectedExperiment.id, userId, playerCount)

  // Check if this variation should be auto-closed (for fill_sequential with maxPerVariation)
  if (batch.assignmentStrategy === 'fill_sequential' && batch.maxPerVariation) {
    const updatedExp = await getExperimentById(selectedExperiment.id)
    if (updatedExp && updatedExp.players.length >= batch.maxPerVariation) {
      await updateExperimentStatus(selectedExperiment.id, 'closed')
    }
  }

  return result
}

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
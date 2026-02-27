export type UserRole = 'experimenter' | 'subject'

export interface User {
  /** Wallet address — the on-chain identity */
  id: string
  name: string
  role: UserRole
  createdAt: number
  /** On-chain uint32 user_id assigned by BxHiveRegistry */
  userId?: number
}

// Experiment Templates

export interface ParameterSchema {
  name: string
  type: 'number' | 'string'
  label: string
  description?: string
  default?: number | string
  min?: number
  max?: number
}

export interface ExperimentTemplate {
  id: string
  name: string
  label: string
  description: string
  playerCount: 1 | 2
  parameterSchema: ParameterSchema[]
  disabled?: boolean
}

// Experiment Instance

export type ExperimentStatus = 'active' | 'closed' | 'completed'
export type MatchStatus = 'waiting' | 'playing' | 'completed'

// Experiment-specific state stored in Match
export type TrustExperimentPhase = 'investor_decision' | 'trustee_decision' | 'completed'

export interface TrustExperimentState {
  phase: TrustExperimentPhase
  investorDecision?: number // Amount invested (s)
  trusteeDecision?: number // Amount returned (r)
  investorPayout?: number
  trusteePayout?: number
}

export type BRETPhase = 'decision' | 'completed'

export interface BRETState {
  phase: BRETPhase
  boxesCollected?: number // Number of boxes player chose to collect
  selectedBoxes?: number[] // Indices of boxes player selected
  bombLocation?: number // Index of bomb in flattened grid (0 to rows*cols-1)
  hitBomb?: boolean // Whether the bomb was in selected boxes
  payout?: number // Final payout amount
}

export interface Player {
  userId: string
  registeredAt: number
}

export interface Match {
  id: string
  player1Id: string
  player2Id?: string
  status: MatchStatus
  createdAt: number
  state?: TrustExperimentState | BRETState // Experiment-specific state
}

export interface Experiment {
  id: string
  templateId: string
  experimenterId: string
  name: string
  parameters: Record<string, number | string>
  status: ExperimentStatus
  createdAt: number
  players: Player[]
  matches: Match[]
  batchId?: string // Links to parent batch (if part of a batch)
  variationIndex?: number // Index within batch (0, 1, 2, ...)
}

// Batch Experiment Types

export type AssignmentStrategy = 'fill_sequential' | 'round_robin'

export interface ParameterVariation {
  parameterName: string // e.g., "m"
  values: (number | string)[] // e.g., [3, 4, 5]
}

export interface ExperimentBatch {
  id: string
  name: string // Display name for participants
  templateId: string
  experimenterId: string
  baseParameters: Record<string, number | string> // Non-varied parameters
  variations: ParameterVariation[] // Multiple parameters can be varied
  assignmentStrategy: AssignmentStrategy
  maxPerVariation?: number // Optional cap per variation
  experimentIds: string[] // IDs of actual experiments
  createdAt: number
  status: ExperimentStatus
}

export type UserRole = 'experimenter' | 'subject'

export interface User {
  id: string
  name: string
  role: UserRole
  createdAt: number
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
}

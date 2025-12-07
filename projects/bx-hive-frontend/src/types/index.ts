export type UserRole = 'experimenter' | 'subject'

export interface User {
  id: string
  name: string
  role: UserRole
  createdAt: number
}

// Game Templates

export interface ParameterSchema {
  name: string
  type: 'number' | 'string'
  label: string
  description?: string
  default?: number | string
  min?: number
  max?: number
}

export interface GameTemplate {
  id: string
  name: string
  label: string
  description: string
  playerCount: 1 | 2
  parameterSchema: ParameterSchema[]
}

// Game Instance

export type GameStatus = 'open' | 'active' | 'completed'
export type MatchStatus = 'waiting' | 'playing' | 'completed'

// Game-specific state stored in Match
export type TrustGamePhase = 'investor_decision' | 'trustee_decision' | 'completed'

export interface TrustGameState {
  phase: TrustGamePhase
  investorDecision?: number // Amount invested (s)
  trusteeDecision?: number // Amount returned (r)
  investorPayout?: number
  trusteePayout?: number
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
  state?: TrustGameState // Game-specific state
}

export interface Game {
  id: string
  templateId: string
  experimenterId: string
  name: string
  parameters: Record<string, number | string>
  status: GameStatus
  createdAt: number
  players: Player[]
  matches: Match[]
}

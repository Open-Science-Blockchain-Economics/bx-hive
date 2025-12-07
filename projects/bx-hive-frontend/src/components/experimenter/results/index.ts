import BRETResults from './BRETResults'
import TrustGameResults from './TrustGameResults'

export const GAME_RESULTS_COMPONENTS = {
  'trust-game': TrustGameResults,
  bret: BRETResults,
} as const

export { BRETResults, TrustGameResults }

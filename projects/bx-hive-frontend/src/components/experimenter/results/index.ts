import BRETResults from './BRETResults'
import TrustExperimentResults from './TrustExperimentResults'

export const EXPERIMENT_RESULTS_COMPONENTS = {
  'trust-game': TrustExperimentResults,
  bret: BRETResults,
} as const

export { BRETResults, TrustExperimentResults }

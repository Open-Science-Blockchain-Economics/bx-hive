import type { BRETState, Experiment, Match } from '../../../types'
import BRETInterface from './BRETInterface'

interface BRETExperimentProps {
  experiment: Experiment
  match: Match
  activeUserId: string
  onExperimentUpdate: () => void
}

export default function BRETExperiment({ experiment, match, onExperimentUpdate }: BRETExperimentProps) {
  // Extract BRET parameters
  const rows = experiment.parameters.rows as number
  const cols = experiment.parameters.cols as number
  const paymentPerBox = experiment.parameters.paymentPerBox as number

  // Check if state is initialized
  if (!match.state) {
    return (
      <div className="text-center py-8 text-base-content/60">
        <p>Experiment state not initialized</p>
      </div>
    )
  }

  const state = match.state as BRETState

  return (
    <BRETInterface
      experimentId={experiment.id}
      matchId={match.id}
      rows={rows}
      cols={cols}
      paymentPerBox={paymentPerBox}
      state={state}
      onDecisionMade={onExperimentUpdate}
    />
  )
}
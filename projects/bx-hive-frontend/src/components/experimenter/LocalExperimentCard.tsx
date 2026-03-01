import { getTemplateById } from '../../experiment-logic/templates'
import { StatusBadge } from '../ui'
import type { Experiment } from '../../types'

interface LocalExperimentCardProps {
  experiment: Experiment
}

export default function LocalExperimentCard({ experiment }: LocalExperimentCardProps) {
  const template = getTemplateById(experiment.templateId)

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title">{experiment.name}</h3>
            <p className="text-sm text-base-content/70">{template?.label || experiment.templateId}</p>
          </div>
          <StatusBadge status={experiment.status} />
        </div>
        <div className="text-sm mt-2">
          <span className="text-base-content/70">Players: </span>
          <span className="font-medium">{experiment.players.length}</span>
        </div>
      </div>
    </div>
  )
}

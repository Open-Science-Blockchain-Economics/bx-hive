import { getVariationLabel } from '../../db'
import { getTemplateById } from '../../experiment-logic/templates'
import type { Experiment, ExperimentBatch, ParameterVariation } from '../../types'

interface LocalBatchCardProps {
  batch: ExperimentBatch & { experiments: Experiment[] }
}

export default function LocalBatchCard({ batch }: LocalBatchCardProps) {
  const template = getTemplateById(batch.templateId)

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title">{batch.name}</h3>
            <p className="text-sm text-base-content/70">
              {template?.label || batch.templateId} &bull; {batch.experiments.length} variations &bull;{' '}
              {batch.assignmentStrategy === 'round_robin' ? 'Round Robin' : 'Fill Sequential'}
            </p>
          </div>
          <span className="badge badge-neutral">BATCH</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
          {batch.experiments.map((exp, idx) => {
            const varLabel = getVariationLabel(exp.parameters, batch.variations as ParameterVariation[])
            return (
              <div key={exp.id} className="bg-base-200 rounded-lg p-2 text-sm">
                <div className="font-medium">
                  V{idx + 1}: {varLabel}
                </div>
                <div className="text-xs text-base-content/70">{exp.players.length} players</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

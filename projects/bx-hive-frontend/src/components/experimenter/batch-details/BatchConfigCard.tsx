import { getTemplateById } from '../../../experiment-logic/templates'
import type { ExperimentBatch } from '../../../types'

interface BatchConfigCardProps {
  batch: ExperimentBatch
  variationCount: number
}

export default function BatchConfigCard({ batch, variationCount }: BatchConfigCardProps) {
  const template = getTemplateById(batch.templateId)

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title">Batch Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <span className="text-sm text-base-content/70">Assignment Strategy</span>
            <div className="font-semibold">{batch.assignmentStrategy === 'round_robin' ? 'Round Robin' : 'Fill Sequential'}</div>
          </div>
          <div>
            <span className="text-sm text-base-content/70">Max Per Variation</span>
            <div className="font-semibold">{batch.maxPerVariation ?? 'No limit'}</div>
          </div>
          <div>
            <span className="text-sm text-base-content/70">Varied Parameters</span>
            <div className="font-semibold">{batch.variations.map((v) => v.parameterName).join(', ')}</div>
          </div>
          <div>
            <span className="text-sm text-base-content/70">Number of Variations</span>
            <div className="font-semibold">{variationCount}</div>
          </div>
        </div>

        <div className="divider">Base Parameters</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {template?.parameterSchema
            .filter((param) => !batch.variations.some((v) => v.parameterName === param.name))
            .map((param) => (
              <div key={param.name}>
                <span className="text-sm text-base-content/70">{param.label}</span>
                <div className="font-semibold">{batch.baseParameters[param.name]}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

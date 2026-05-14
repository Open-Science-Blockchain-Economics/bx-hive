import { Panel } from '@/components/ds/card'
import { Rule } from '@/components/ds/separator'
import { getTemplateById } from '../../../experiment-logic/templates'
import type { ExperimentBatch } from '../../../types'

interface BatchConfigCardProps {
  batch: ExperimentBatch
  variationCount: number
}

interface ConfigItemProps {
  label: string
  value: React.ReactNode
}

function ConfigItem({ label, value }: ConfigItemProps) {
  return (
    <div>
      <span className="t-micro">{label}</span>
      <div className="font-semibold mt-0.5">{value}</div>
    </div>
  )
}

export default function BatchConfigCard({ batch, variationCount }: BatchConfigCardProps) {
  const template = getTemplateById(batch.templateId)
  const baseParams = template?.parameterSchema.filter((param) => !batch.variations.some((v) => v.parameterName === param.name)) ?? []

  return (
    <Panel>
      <h2 className="t-h2 mb-4">Batch Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConfigItem label="Assignment Strategy" value={batch.assignmentStrategy === 'round_robin' ? 'Round Robin' : 'Fill Sequential'} />
        <ConfigItem label="Max Per Variation" value={batch.maxPerVariation ?? 'No limit'} />
        <ConfigItem label="Varied Parameters" value={batch.variations.map((v) => v.parameterName).join(', ')} />
        <ConfigItem label="Number of Variations" value={variationCount} />
      </div>
      {baseParams.length > 0 && (
        <>
          <Rule label="Base Parameters" className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {baseParams.map((param) => (
              <ConfigItem key={param.name} label={param.label} value={batch.baseParameters[param.name]} />
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}

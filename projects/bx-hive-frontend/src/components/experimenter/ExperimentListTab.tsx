import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import type { ExperimentGroup, VariationInfo } from '../../hooks/useTrustExperiments'
import type { VariationConfig } from '../../hooks/useTrustVariation'
import OnChainExperimentCard from './OnChainExperimentCard'

interface OnChainExperiment {
  group: ExperimentGroup
  variations: VariationInfo[]
}

interface ExperimentListTabProps {
  onChainExps: OnChainExperiment[]
  subjectCounts: Record<string, number>
  variationConfigs: Record<string, VariationConfig>
  onCreateClick: () => void
}

export default function ExperimentListTab({ onChainExps, subjectCounts, variationConfigs, onCreateClick }: ExperimentListTabProps) {
  if (onChainExps.length === 0) {
    return (
      <Panel className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-4">No experiments yet. Create your first experiment.</p>
        <Btn variant="primary" size="sm" onClick={onCreateClick}>
          Create experiment
        </Btn>
      </Panel>
    )
  }

  return (
    <div className="grid gap-4">
      {onChainExps.map(({ group, variations }) => (
        <OnChainExperimentCard
          key={group.expId}
          group={group}
          variations={variations}
          subjectCounts={subjectCounts}
          variationConfigs={variationConfigs}
        />
      ))}
    </div>
  )
}

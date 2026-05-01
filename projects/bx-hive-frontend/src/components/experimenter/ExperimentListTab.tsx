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
      <div className="text-center py-12 text-base-content/70">
        <p>No experiments yet. Create your first experiment!</p>
        <button className="btn btn-primary mt-4" onClick={onCreateClick}>
          Create Experiment
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
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

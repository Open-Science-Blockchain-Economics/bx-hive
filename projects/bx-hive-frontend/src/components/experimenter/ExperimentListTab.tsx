import type { ExperimentGroup, VariationInfo } from '../../hooks/useTrustExperiments'
import type { VariationConfig } from '../../hooks/useTrustVariation'
import type { Experiment, ExperimentBatch } from '../../types'
import { LoadingSpinner } from '../ui'
import LocalBatchCard from './LocalBatchCard'
import LocalExperimentCard from './LocalExperimentCard'
import OnChainExperimentCard from './OnChainExperimentCard'

interface OnChainExperiment {
  group: ExperimentGroup
  variations: VariationInfo[]
}

interface BatchWithExperiments extends ExperimentBatch {
  experiments: Experiment[]
}

interface ExperimentListTabProps {
  loading: boolean
  onChainExps: OnChainExperiment[]
  localBatches: BatchWithExperiments[]
  localExperiments: Experiment[]
  subjectCounts: Record<string, number>
  variationConfigs: Record<string, VariationConfig>
  onCreateClick: () => void
}

export default function ExperimentListTab({
  loading,
  onChainExps,
  localBatches,
  localExperiments,
  subjectCounts,
  variationConfigs,
  onCreateClick,
}: ExperimentListTabProps) {
  const hasOnChain = onChainExps.length > 0
  const hasLocal = localExperiments.length > 0 || localBatches.length > 0

  if (loading) {
    return <LoadingSpinner />
  }

  if (!hasOnChain && !hasLocal) {
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

      {localBatches.map((batch) => (
        <LocalBatchCard key={batch.id} batch={batch} />
      ))}

      {localExperiments.map((experiment) => (
        <LocalExperimentCard key={experiment.id} experiment={experiment} />
      ))}
    </div>
  )
}

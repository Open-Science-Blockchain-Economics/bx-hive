import type { ExperimentGroup, VariationInfo } from '../../hooks/useTrustExperiments'

interface JoinableExperimentCardProps {
  group: ExperimentGroup
  variations: VariationInfo[]
  joining: number | null
  joinError: string | null
  onJoin: (expId: number, variations: VariationInfo[]) => void
}

export default function JoinableExperimentCard({ group, variations, joining, joinError, onJoin }: JoinableExperimentCardProps) {
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title">{group.name}</h3>
            <p className="text-sm text-base-content/70">
              Trust Game &middot; Experiment ID: {group.expId}
            </p>
          </div>
          <span className="badge badge-info">Open</span>
        </div>
        {joinError && joining === null && <div className="text-error text-sm mt-2">{joinError}</div>}
        <div className="card-actions justify-end mt-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={joining !== null}
            onClick={() => onJoin(group.expId, variations)}
          >
            {joining === group.expId ? <span className="loading loading-spinner loading-xs"></span> : 'Join Experiment'}
          </button>
        </div>
      </div>
    </div>
  )
}

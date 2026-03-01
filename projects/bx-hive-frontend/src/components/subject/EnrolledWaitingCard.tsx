import type { ExperimentGroup } from '../../hooks/useTrustExperiments'

interface EnrolledWaitingCardProps {
  group: ExperimentGroup
}

export default function EnrolledWaitingCard({ group }: EnrolledWaitingCardProps) {
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title">{group.name}</h3>
            <p className="text-sm text-base-content/70">Enrolled — waiting for match assignment</p>
          </div>
          <span className="badge badge-ghost">Waiting</span>
        </div>
      </div>
    </div>
  )
}

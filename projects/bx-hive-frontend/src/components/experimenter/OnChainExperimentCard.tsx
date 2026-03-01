import { Link } from 'react-router-dom'
import type { ExperimentGroup, VariationInfo } from '../../hooks/useTrustExperiments'
import type { VariationConfig } from '../../hooks/useTrustVariation'
import { StatusDot } from '../ui'
import { statusDotColor, statusLabel } from '../../utils/variationStatus'

interface OnChainExperimentCardProps {
  group: ExperimentGroup
  variations: VariationInfo[]
  subjectCounts: Record<string, number>
  variationConfigs: Record<string, VariationConfig>
}

export default function OnChainExperimentCard({ group, variations, subjectCounts, variationConfigs }: OnChainExperimentCardProps) {
  const totalSubjects = variations.reduce((sum, v) => sum + (subjectCounts[String(v.appId)] ?? 0), 0)

  return (
    <Link
      to={`/experimenter/trust/${group.expId}`}
      className="card bg-base-100 border border-base-300 hover:bg-base-200 cursor-pointer transition-colors"
    >
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title">{group.name}</h3>
            <p className="text-sm text-base-content/70">
              {Number(group.variationCount)} variation{Number(group.variationCount) !== 1 ? 's' : ''} &middot; {totalSubjects} subject
              {totalSubjects !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="badge badge-primary badge-sm">TRUST</span>
        </div>

        <div className="flex flex-wrap gap-3 mt-2">
          {variations.map((v) => {
            const cfg = variationConfigs[String(v.appId)]
            const color = statusDotColor(cfg)
            const label = statusLabel(cfg)
            return (
              <span key={v.varId} className="text-xs text-base-content/70 flex items-center gap-1">
                Var {v.varId + 1}
                <StatusDot color={color} label={label} />
                {label}
              </span>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

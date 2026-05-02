import { Link } from 'react-router-dom'

import { Chip } from '@/components/ds/badge'
import { Panel } from '@/components/ds/card'
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
    <Link to={`/experimenter/trust/${group.expId}`} className="block group focus-visible:outline-none">
      <Panel className="transition-colors group-hover:bg-muted group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="t-h2 mb-1">{group.name}</h3>
            <p className="text-sm text-muted-foreground">
              {Number(group.variationCount)} variation{Number(group.variationCount) !== 1 ? 's' : ''} · {totalSubjects} subject
              {totalSubjects !== 1 ? 's' : ''}
            </p>
          </div>
          <Chip tone="accent">Trust</Chip>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
          {variations.map((v) => {
            const cfg = variationConfigs[String(v.appId)]
            const color = statusDotColor(cfg)
            const label = statusLabel(cfg)
            return (
              <span key={v.varId} className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <span className="font-mono text-ink-2">Var {v.varId + 1}</span>
                <StatusDot color={color} label={label} />
                {label}
              </span>
            )
          })}
        </div>
      </Panel>
    </Link>
  )
}

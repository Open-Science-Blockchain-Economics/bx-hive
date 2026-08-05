import { Link } from 'react-router-dom'

import AssetIcon from '@/components/AssetIcon'
import DebugInfo from '@/components/DebugInfo'
import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { useAssetMetadata } from '@/hooks/useAssetMetadata'
import type { ExperimentGroup, VariationInfo } from '@/hooks/useTrustExperiments'
import type { Match, VariationConfig } from '@/hooks/useTrustVariation'
import { baseUnitsToWhole } from '@/utils/amount'

interface CompletedMatchCardProps {
  group: ExperimentGroup
  variation: VariationInfo
  config: VariationConfig
  match: Match
  activeAddress: string
}

export default function CompletedMatchCard({ group, variation, config, match, activeAddress }: CompletedMatchCardProps) {
  const { decimals, unitName } = useAssetMetadata(config.assetId)
  const payout = match.investor === activeAddress ? match.investorPayout : match.trusteePayout

  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="t-h2 mb-1">{group.name}</h3>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            Payout:{' '}
            <span className="font-mono font-medium text-pos inline-flex items-center gap-1">
              {baseUnitsToWhole(payout, decimals).toLocaleString()} {unitName}
              <AssetIcon assetId={config.assetId} unitName={unitName} className="size-3.5" />
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DebugInfo group={group} variations={[variation]} config={config} match={match} />
          <Chip tone="pos">Completed</Chip>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <Btn asChild variant="ghost" size="sm">
          <Link to={`/play/${String(variation.appId)}`}>View results</Link>
        </Btn>
      </div>
    </Panel>
  )
}

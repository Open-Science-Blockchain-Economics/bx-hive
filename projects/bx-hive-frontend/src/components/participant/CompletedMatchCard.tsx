import { Link } from 'react-router-dom'

import AssetIcon from '@/components/AssetIcon'
import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { useAssetMetadata } from '@/hooks/useAssetMetadata'
import type { Match } from '@/hooks/useTrustVariation'
import { baseUnitsToWhole } from '@/utils/amount'

interface CompletedMatchCardProps {
  appId: bigint
  match: Match
  activeAddress: string
  /** Variation's payout asset id (0n for native ALGO). */
  assetId: bigint
}

export default function CompletedMatchCard({ appId, match, activeAddress, assetId }: CompletedMatchCardProps) {
  const { decimals, unitName } = useAssetMetadata(assetId)
  const payout = match.investor === activeAddress ? match.investorPayout : match.trusteePayout

  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="t-h2 mb-1">Trust Game</h3>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            Payout:{' '}
            <span className="font-mono font-medium text-pos inline-flex items-center gap-1">
              {baseUnitsToWhole(payout, decimals).toLocaleString()} {unitName}
              <AssetIcon assetId={assetId} unitName={unitName} className="size-3.5" />
            </span>
          </p>
        </div>
        <Chip tone="pos">Completed</Chip>
      </div>
      <div className="flex justify-end mt-4">
        <Btn asChild variant="ghost" size="sm">
          <Link to={`/play/${String(appId)}`}>View results</Link>
        </Btn>
      </div>
    </Panel>
  )
}

import { Link } from 'react-router-dom'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import type { Match } from '@/hooks/useTrustVariation'
import { microAlgoToAlgo } from '@/utils/amount'

interface CompletedMatchCardProps {
  appId: bigint
  match: Match
  activeAddress: string
}

export default function CompletedMatchCard({ appId, match, activeAddress }: CompletedMatchCardProps) {
  const payout = match.investor === activeAddress ? match.investorPayout : match.trusteePayout

  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="t-h2 mb-1">Trust Game</h3>
          <p className="text-xs text-muted-foreground">
            Payout: <span className="font-mono font-medium text-pos">{microAlgoToAlgo(payout).toLocaleString()} ALGO</span>
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

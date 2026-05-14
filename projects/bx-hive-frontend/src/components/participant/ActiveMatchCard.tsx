import { Link } from 'react-router-dom'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION } from '@/hooks/useTrustVariation'
import type { Match } from '@/hooks/useTrustVariation'

interface ActiveMatchCardProps {
  appId: bigint
  match: Match
  activeAddress: string
}

export default function ActiveMatchCard({ appId, match, activeAddress }: ActiveMatchCardProps) {
  const isInvestor = match.investor === activeAddress
  const isMyTurn = (isInvestor && match.phase === PHASE_INVESTOR_DECISION) || (!isInvestor && match.phase === PHASE_TRUSTEE_DECISION)

  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="t-h2 mb-1">Trust Game</h3>
          <p className="text-xs text-muted-foreground">
            Role: <span className="font-medium text-ink-2">{isInvestor ? 'Investor' : 'Trustee'}</span>
          </p>
        </div>
        <Chip tone={isMyTurn ? 'warn' : 'neutral'}>{isMyTurn ? 'Your turn' : 'Waiting'}</Chip>
      </div>
      <div className="flex justify-end mt-4">
        <Btn asChild variant={isMyTurn ? 'primary' : 'ghost'} size="sm">
          <Link to={`/play/${String(appId)}`}>{isMyTurn ? 'Play' : 'View status'}</Link>
        </Btn>
      </div>
    </Panel>
  )
}

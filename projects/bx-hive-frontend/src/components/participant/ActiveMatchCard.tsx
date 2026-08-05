import { Link } from 'react-router-dom'

import DebugInfo from '@/components/DebugInfo'
import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import type { ExperimentGroup, VariationInfo } from '@/hooks/useTrustExperiments'
import { PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION } from '@/hooks/useTrustVariation'
import type { Match, VariationConfig } from '@/hooks/useTrustVariation'

interface ActiveMatchCardProps {
  group: ExperimentGroup
  variation: VariationInfo
  config: VariationConfig
  match: Match
  activeAddress: string
}

export default function ActiveMatchCard({ group, variation, config, match, activeAddress }: ActiveMatchCardProps) {
  const isInvestor = match.investor === activeAddress
  const isMyTurn = (isInvestor && match.phase === PHASE_INVESTOR_DECISION) || (!isInvestor && match.phase === PHASE_TRUSTEE_DECISION)

  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="t-h2 mb-1">{group.name}</h3>
          <p className="text-xs text-muted-foreground">
            Role: <span className="font-medium text-ink-2">{isInvestor ? 'Investor' : 'Trustee'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DebugInfo group={group} variations={[variation]} config={config} match={match} />
          <Chip tone={isMyTurn ? 'warn' : 'neutral'}>{isMyTurn ? 'Your turn' : 'Waiting'}</Chip>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <Btn asChild variant={isMyTurn ? 'primary' : 'ghost'} size="sm">
          <Link to={`/play/${String(variation.appId)}`}>{isMyTurn ? 'Play' : 'View status'}</Link>
        </Btn>
      </div>
    </Panel>
  )
}

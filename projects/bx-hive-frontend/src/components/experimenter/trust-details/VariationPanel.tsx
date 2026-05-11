import { Panel } from '@/components/ds/card'
import type { VariationInfo } from '../../../hooks/useTrustExperiments'
import { STATUS_ACTIVE } from '../../../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../../../hooks/useTrustVariation'
import CreateMatchForm from './CreateMatchForm'
import MatchesTable from './MatchesTable'
import ParticipantsTable from './ParticipantsTable'
import VariationConfigCard from './VariationConfigCard'

interface ParticipantEntry {
  address: string
  enrolled: number
  assigned: number
}

interface VariationPanelProps {
  variation: VariationInfo
  participants: ParticipantEntry[]
  matches: Match[]
  config: VariationConfig | undefined
  onCreateMatch: (appId: bigint, investor: string, trustee: string) => Promise<void>
}

export default function VariationPanel({ variation, participants, matches, config, onCreateMatch }: VariationPanelProps) {
  const unassigned = participants.filter((s) => s.assigned === 0)

  return (
    <Panel className="flex flex-col gap-6">
      <VariationConfigCard config={config} appId={variation.appId} participantCount={participants.length} />
      <ParticipantsTable participants={participants} />
      {config && config.status === STATUS_ACTIVE && (
        <CreateMatchForm appId={variation.appId} unassigned={unassigned} onCreateMatch={onCreateMatch} />
      )}
      <MatchesTable matches={matches} />
    </Panel>
  )
}

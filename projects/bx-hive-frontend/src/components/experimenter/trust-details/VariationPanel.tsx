import { Panel } from '@/components/ds/card'
import { useAssetMetadata } from '../../../hooks/useAssetMetadata'
import type { VariationInfo } from '../../../hooks/useTrustExperiments'
import { STATUS_COMPLETED } from '../../../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../../../hooks/useTrustVariation'
import CreateMatchForm from './CreateMatchForm'
import MatchesTable from './MatchesTable'
import ParticipantsTable from './ParticipantsTable'
import VariationConfigCard from './VariationConfigCard'
import VariationLifecycleControls from './VariationLifecycleControls'

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
  isOwner: boolean
  onCreateMatch: (appId: bigint, investor: string, trustee: string) => Promise<void>
  onCloseRegistration: (appId: bigint) => Promise<void>
  onEndVariation: (appId: bigint) => Promise<void>
  onGetEscrowBalance: (appId: bigint) => Promise<bigint>
}

export default function VariationPanel({
  variation,
  participants,
  matches,
  config,
  isOwner,
  onCreateMatch,
  onCloseRegistration,
  onEndVariation,
  onGetEscrowBalance,
}: VariationPanelProps) {
  const unassigned = participants.filter((s) => s.assigned === 0)
  const { decimals, unitName } = useAssetMetadata(config?.assetId ?? 0n)

  return (
    <Panel className="flex flex-col gap-6">
      <VariationConfigCard
        config={config}
        appId={variation.appId}
        participantCount={participants.length}
        actions={
          config && (
            <VariationLifecycleControls
              appId={variation.appId}
              config={config}
              isOwner={isOwner}
              onCloseRegistration={onCloseRegistration}
              onEndVariation={onEndVariation}
              onGetEscrowBalance={onGetEscrowBalance}
            />
          )
        }
      />
      <ParticipantsTable participants={participants} />
      {/* Closed only blocks new enrolments — create_match stays callable, so already-enrolled participants can still be paired. */}
      {config && config.status !== STATUS_COMPLETED && (
        <CreateMatchForm appId={variation.appId} unassigned={unassigned} onCreateMatch={onCreateMatch} />
      )}
      <MatchesTable matches={matches} decimals={decimals} unitName={unitName} assetId={config?.assetId ?? 0n} />
    </Panel>
  )
}

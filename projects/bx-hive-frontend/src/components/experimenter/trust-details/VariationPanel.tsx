import type { VariationInfo } from '../../../hooks/useTrustExperiments'
import { STATUS_ACTIVE } from '../../../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../../../hooks/useTrustVariation'
import CreateMatchForm from './CreateMatchForm'
import MatchesTable from './MatchesTable'
import SubjectsTable from './SubjectsTable'
import VariationConfigCard from './VariationConfigCard'

interface SubjectEntry {
  address: string
  enrolled: number
  assigned: number
}

interface VariationPanelProps {
  variation: VariationInfo
  subjects: SubjectEntry[]
  matches: Match[]
  config: VariationConfig | undefined
  autoMatch: boolean
  onToggleAutoMatch: (val: boolean) => void
  onCreateMatch: (appId: bigint, investor: string, trustee: string) => Promise<void>
}

export default function VariationPanel({
  variation,
  subjects,
  matches,
  config,
  autoMatch,
  onToggleAutoMatch,
  onCreateMatch,
}: VariationPanelProps) {
  const unassigned = subjects.filter((s) => s.assigned === 0)

  return (
    <div className="rounded-b-box rounded-tr-box p-5 space-y-6">
      <VariationConfigCard config={config} appId={variation.appId} />

      <SubjectsTable subjects={subjects} />

      {config && config.status === STATUS_ACTIVE && (
        <CreateMatchForm
          appId={variation.appId}
          unassigned={unassigned}
          autoMatch={autoMatch}
          onToggleAutoMatch={onToggleAutoMatch}
          onCreateMatch={onCreateMatch}
        />
      )}

      <MatchesTable matches={matches} />
    </div>
  )
}

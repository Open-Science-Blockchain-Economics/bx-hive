import { Panel } from '@/components/ds/card'
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
  onCreateMatch: (appId: bigint, investor: string, trustee: string) => Promise<void>
}

export default function VariationPanel({ variation, subjects, matches, config, onCreateMatch }: VariationPanelProps) {
  const unassigned = subjects.filter((s) => s.assigned === 0)

  return (
    <Panel className="flex flex-col gap-6">
      <VariationConfigCard config={config} appId={variation.appId} />
      <SubjectsTable subjects={subjects} />
      {config && config.status === STATUS_ACTIVE && (
        <CreateMatchForm appId={variation.appId} unassigned={unassigned} onCreateMatch={onCreateMatch} />
      )}
      <MatchesTable matches={matches} />
    </Panel>
  )
}

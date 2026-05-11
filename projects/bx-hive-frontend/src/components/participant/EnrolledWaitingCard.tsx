import { Chip } from '@/components/ds/badge'
import { Panel } from '@/components/ds/card'
import type { ExperimentGroup } from '@/hooks/useTrustExperiments'

interface EnrolledWaitingCardProps {
  group: ExperimentGroup
}

export default function EnrolledWaitingCard({ group }: EnrolledWaitingCardProps) {
  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="t-h2 mb-1">{group.name}</h3>
          <p className="text-sm text-muted-foreground">Enrolled — waiting for match assignment</p>
        </div>
        <Chip tone="warn">Waiting</Chip>
      </div>
    </Panel>
  )
}

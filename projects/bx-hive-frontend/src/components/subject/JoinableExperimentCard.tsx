import { Loader2 } from 'lucide-react'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import type { ExperimentGroup, VariationInfo } from '@/hooks/useTrustExperiments'

interface JoinableExperimentCardProps {
  group: ExperimentGroup
  variations: VariationInfo[]
  joining: number | null
  joinError: string | null
  onJoin: (expId: number, variations: VariationInfo[]) => void
}

export default function JoinableExperimentCard({ group, variations, joining, joinError, onJoin }: JoinableExperimentCardProps) {
  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="t-h2 mb-1">{group.name}</h3>
          <p className="text-sm text-muted-foreground">
            Trust Game · Experiment ID: <span className="font-mono">{group.expId}</span>
          </p>
        </div>
        <Chip tone="info">Open</Chip>
      </div>
      {joinError && joining === null && <p className="text-sm text-neg mt-3">{joinError}</p>}
      <div className="flex justify-end mt-4">
        <Btn variant="primary" size="sm" disabled={joining !== null} onClick={() => onJoin(group.expId, variations)}>
          {joining === group.expId ? <Loader2 className="size-3.5 animate-spin" /> : 'Join experiment'}
        </Btn>
      </div>
    </Panel>
  )
}

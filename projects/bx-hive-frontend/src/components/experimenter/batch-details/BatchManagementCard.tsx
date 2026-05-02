import { Loader2 } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import type { Experiment, ExperimentBatch } from '../../../types'

interface BatchManagementCardProps {
  batch: ExperimentBatch
  experiments: Experiment[]
  actionInProgress: boolean
  onCloseBatch: () => void
  onReopenBatch: () => void
}

export default function BatchManagementCard({
  batch,
  experiments,
  actionInProgress,
  onCloseBatch,
  onReopenBatch,
}: BatchManagementCardProps) {
  const totalPlayers = experiments.reduce((sum, exp) => sum + exp.players.length, 0)
  const totalPlaying = experiments.reduce((sum, exp) => sum + exp.matches.filter((m) => m.status === 'playing').length, 0)
  const totalCompleted = experiments.reduce((sum, exp) => sum + exp.matches.filter((m) => m.status === 'completed').length, 0)
  const activeCount = experiments.filter((e) => e.status === 'active').length

  return (
    <Panel>
      <h2 className="t-h2 mb-3">Batch Management</h2>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Variations:</span>
              <span className="font-semibold font-mono">
                {activeCount} / {experiments.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Players:</span>
              <span className="font-semibold font-mono">{totalPlayers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Playing:</span>
              <span className="font-semibold font-mono text-warn">{totalPlaying}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-semibold font-mono text-pos">{totalCompleted}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {batch.status === 'active' && (
            <Btn variant="danger" onClick={onCloseBatch} disabled={actionInProgress}>
              {actionInProgress ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Closing…
                </>
              ) : (
                'Close all variations'
              )}
            </Btn>
          )}
          {batch.status === 'closed' && (
            <Btn variant="primary" onClick={onReopenBatch} disabled={actionInProgress}>
              {actionInProgress ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Reopening…
                </>
              ) : (
                'Reopen all variations'
              )}
            </Btn>
          )}
        </div>
      </div>
    </Panel>
  )
}

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
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title">Batch Management</h2>

        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/70">Active Variations:</span>
                <span className="font-semibold">
                  {activeCount} / {experiments.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Total Players:</span>
                <span className="font-semibold">{totalPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Playing:</span>
                <span className="font-semibold text-warning">{totalPlaying}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Completed:</span>
                <span className="font-semibold text-success">{totalCompleted}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {batch.status === 'active' && (
              <button className="btn btn-warning" onClick={onCloseBatch} disabled={actionInProgress}>
                {actionInProgress ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Closing...
                  </>
                ) : (
                  <>Close All Variations</>
                )}
              </button>
            )}

            {batch.status === 'closed' && (
              <button className="btn btn-success" onClick={onReopenBatch} disabled={actionInProgress}>
                {actionInProgress ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Reopening...
                  </>
                ) : (
                  <>Reopen All Variations</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { submitBRETDecision } from '../../../db'
import type { BRETState } from '../../../types'
import BRETBox from './BRETBox'

interface BRETInterfaceProps {
  gameId: string
  matchId: string
  rows: number
  cols: number
  paymentPerBox: number
  state: BRETState
  onDecisionMade: () => void
}

export default function BRETInterface({ gameId, matchId, rows, cols, paymentPerBox, state, onDecisionMade }: BRETInterfaceProps) {
  const [boxesInput, setBoxesInput] = useState<string>('')
  const [targetCount, setTargetCount] = useState<number | null>(null)
  const [selectedBoxes, setSelectedBoxes] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalBoxes = rows * cols
  const maxBoxes = totalBoxes - 1

  // Parse input
  const boxesCount = parseInt(boxesInput, 10)
  const isValidInput = !isNaN(boxesCount) && boxesCount >= 1 && boxesCount <= maxBoxes

  // Calculate potential payout and risk
  const potentialPayout = targetCount ? targetCount * paymentPerBox : 0
  const riskPercentage = targetCount ? ((targetCount / totalBoxes) * 100).toFixed(1) : '0'

  const handleLockCount = () => {
    if (isValidInput) {
      setTargetCount(boxesCount)
      setError(null)
    }
  }

  const handleBoxClick = (index: number) => {
    if (!targetCount) return

    setSelectedBoxes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        // Deselect
        next.delete(index)
      } else {
        // Select (if under limit)
        if (next.size < targetCount) {
          next.add(index)
        }
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (selectedBoxes.size !== targetCount) return

    setIsSubmitting(true)
    setError(null)

    try {
      await submitBRETDecision(gameId, matchId, Array.from(selectedBoxes))
      onDecisionMade()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision')
      setIsSubmitting(false)
    }
  }

  // Render decision phase
  if (state.phase === 'decision') {
    return (
      <div className="space-y-6">
        {/* Instructions */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title">Collect Boxes to Earn Money</h2>
            <p className="text-base-content/70">
              One box in the grid contains a bomb 💣. Choose how many boxes you want to collect, then select them.
            </p>
            <ul className="list-disc list-inside text-sm text-base-content/60 space-y-1">
              <li>First, decide how many boxes to collect</li>
              <li>Then, click on boxes to select them</li>
              <li>
                Each box you collect earns you <span className="font-semibold">${paymentPerBox}</span>
              </li>
              <li>If the bomb is in your selected boxes, you earn nothing</li>
            </ul>
          </div>
        </div>

        {/* Phase 1: Enter Count (if not locked) */}
        {!targetCount && (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h3 className="font-semibold mb-4">Step 1: How Many Boxes?</h3>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Choose how many boxes to collect:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={maxBoxes}
                    value={boxesInput}
                    onChange={(e) => setBoxesInput(e.target.value)}
                    placeholder={`Enter 1 to ${maxBoxes}`}
                    className="input input-bordered flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && isValidInput && handleLockCount()}
                  />
                  <button className="btn btn-primary" onClick={handleLockCount} disabled={!isValidInput}>
                    Lock In Count
                  </button>
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/50">Must be between 1 and {maxBoxes}</span>
                </label>
              </div>

              {isValidInput && (
                <div className="stats shadow mt-4">
                  <div className="stat">
                    <div className="stat-title">Potential Payout</div>
                    <div className="stat-value text-success">${boxesCount * paymentPerBox}</div>
                    <div className="stat-desc">
                      {boxesCount} boxes × ${paymentPerBox}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Risk of Bomb</div>
                    <div className="stat-value text-warning">{((boxesCount / totalBoxes) * 100).toFixed(1)}%</div>
                    <div className="stat-desc">
                      {boxesCount} out of {totalBoxes} boxes
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 2: Select Boxes (if locked) */}
        {targetCount && (
          <>
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Step 2: Select {targetCount} Boxes</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTargetCount(null)}>
                    Change Count
                  </button>
                </div>

                <div className="alert alert-info mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium">Click boxes to select them. Click again to deselect.</p>
                    <p>
                      Selected: <span className="font-bold">{selectedBoxes.size}</span> / {targetCount}
                    </p>
                  </div>
                </div>

                <div
                  className="grid gap-1 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    maxWidth: `${cols * 40}px`,
                  }}
                >
                  {Array.from({ length: totalBoxes }).map((_, index) => (
                    <BRETBox
                      key={index}
                      index={index}
                      isSelected={selectedBoxes.has(index)}
                      isClickable={true}
                      onClick={() => handleBoxClick(index)}
                      isBomb={false}
                      showResult={false}
                    />
                  ))}
                </div>

                <div className="stats shadow mt-4">
                  <div className="stat">
                    <div className="stat-title">Potential Payout</div>
                    <div className="stat-value text-success">${potentialPayout}</div>
                    <div className="stat-desc">
                      {targetCount} boxes × ${paymentPerBox}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Risk of Bomb</div>
                    <div className="stat-value text-warning">{riskPercentage}%</div>
                    <div className="stat-desc">
                      {targetCount} out of {totalBoxes} boxes
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-error mt-4">
                    <span>{error}</span>
                  </div>
                )}

                <button
                  className="btn btn-primary mt-4"
                  onClick={handleSubmit}
                  disabled={selectedBoxes.size !== targetCount || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Submitting...
                    </>
                  ) : selectedBoxes.size !== targetCount ? (
                    `Select ${targetCount - selectedBoxes.size} More Box${targetCount - selectedBoxes.size !== 1 ? 'es' : ''}`
                  ) : (
                    'Submit Selection'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // Render results phase
  if (
    state.phase === 'completed' &&
    state.boxesCollected !== undefined &&
    state.bombLocation !== undefined &&
    state.selectedBoxes !== undefined
  ) {
    const hitBomb = state.hitBomb ?? false
    const payout = state.payout ?? 0
    const selectedSet = new Set(state.selectedBoxes)

    return (
      <div className="space-y-6">
        {/* Results Summary */}
        <div className={`alert ${hitBomb ? 'alert-error' : 'alert-success'}`}>
          <div>
            <h3 className="font-bold text-lg">{hitBomb ? '💥 Bomb Hit!' : '✓ Success!'}</h3>
            <p className="text-sm">You collected {state.boxesCollected} boxes.</p>
            <p className="text-xl font-bold mt-2">Final Payout: ${payout}</p>
          </div>
        </div>

        {/* Grid with Results */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="font-semibold mb-2">Results</h3>
            <p className="text-sm text-base-content/70 mb-4">
              {hitBomb
                ? `The bomb was at position ${state.bombLocation + 1}. You selected that box!`
                : `The bomb was at position ${state.bombLocation + 1}. You avoided it!`}
            </p>
            <div
              className="grid gap-1 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                maxWidth: `${cols * 40}px`,
              }}
            >
              {Array.from({ length: totalBoxes }).map((_, index) => (
                <BRETBox
                  key={index}
                  index={index}
                  isSelected={selectedSet.has(index)}
                  isClickable={false}
                  isBomb={index === state.bombLocation}
                  showResult={true}
                />
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <a href="/dashboard/subject" className="btn btn-outline">
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback for unexpected state
  return (
    <div className="alert alert-warning">
      <span>Unexpected game state</span>
    </div>
  )
}

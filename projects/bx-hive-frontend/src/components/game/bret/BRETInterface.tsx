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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalBoxes = rows * cols
  const maxBoxes = totalBoxes - 1

  // Parse input
  const boxesCollected = parseInt(boxesInput, 10)
  const isValidInput = !isNaN(boxesCollected) && boxesCollected >= 1 && boxesCollected <= maxBoxes

  // Calculate potential payout and risk
  const potentialPayout = isValidInput ? boxesCollected * paymentPerBox : 0
  const riskPercentage = isValidInput ? ((boxesCollected / totalBoxes) * 100).toFixed(1) : '0'

  const handleSubmit = async () => {
    if (!isValidInput) return

    setIsSubmitting(true)
    setError(null)

    try {
      await submitBRETDecision(gameId, matchId, boxesCollected)
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
            <p className="text-base-content/70">One box in the grid contains a bomb 💣. Choose how many boxes you want to collect.</p>
            <ul className="list-disc list-inside text-sm text-base-content/60 space-y-1">
              <li>Boxes are collected from left to right, top to bottom</li>
              <li>
                Each box you collect earns you <span className="font-semibold">${paymentPerBox}</span>
              </li>
              <li>If the bomb is in your collected boxes, you earn nothing</li>
            </ul>
          </div>
        </div>

        {/* Grid Display */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="font-semibold mb-2">
              Grid: {rows} × {cols} = {totalBoxes} boxes
            </h3>
            <div
              className="grid gap-1 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                maxWidth: `${cols * 40}px`,
              }}
            >
              {Array.from({ length: totalBoxes }).map((_, index) => (
                <BRETBox key={index} index={index} isCollected={false} isBomb={false} showResult={false} />
              ))}
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="font-semibold mb-4">Make Your Decision</h3>

            <div className="form-control">
              <label className="label">
                <span className="label-text">How many boxes do you want to collect?</span>
              </label>
              <input
                type="number"
                min="1"
                max={maxBoxes}
                value={boxesInput}
                onChange={(e) => setBoxesInput(e.target.value)}
                placeholder={`Enter 1 to ${maxBoxes}`}
                className="input input-bordered"
                disabled={isSubmitting}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">Must be between 1 and {maxBoxes}</span>
              </label>
            </div>

            {isValidInput && (
              <div className="stats shadow mt-4">
                <div className="stat">
                  <div className="stat-title">Potential Payout</div>
                  <div className="stat-value text-success">${potentialPayout}</div>
                  <div className="stat-desc">
                    {boxesCollected} boxes × ${paymentPerBox}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">Risk of Bomb</div>
                  <div className="stat-value text-warning">{riskPercentage}%</div>
                  <div className="stat-desc">
                    {boxesCollected} out of {totalBoxes} boxes
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            <button className="btn btn-primary mt-4" onClick={handleSubmit} disabled={!isValidInput || isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Submitting...
                </>
              ) : (
                'Collect Boxes'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render results phase
  if (state.phase === 'completed' && state.boxesCollected !== undefined && state.bombLocation !== undefined) {
    const hitBomb = state.hitBomb ?? false
    const payout = state.payout ?? 0

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
                ? `The bomb was at position ${state.bombLocation + 1}. You collected ${state.boxesCollected} boxes, which included the bomb.`
                : `The bomb was at position ${state.bombLocation + 1}. You collected ${state.boxesCollected} boxes and avoided it!`}
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
                  isCollected={index < state.boxesCollected!}
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

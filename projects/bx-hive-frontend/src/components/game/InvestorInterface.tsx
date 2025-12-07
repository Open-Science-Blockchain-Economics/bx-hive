import { useState } from 'react'
import { submitInvestorDecision } from '../../db'
import { calculateInvestorRefund, calculateTrusteeReceived } from '../../game/trustGame'

interface InvestorInterfaceProps {
  gameId: string
  matchId: string
  E1: number
  m: number
  UNIT: number
  onDecisionMade: () => void
}

export default function InvestorInterface({
  gameId,
  matchId,
  E1,
  m,
  UNIT,
  onDecisionMade,
}: InvestorInterfaceProps) {
  const [investment, setInvestment] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refund = calculateInvestorRefund(E1, investment)
  const trusteeReceives = calculateTrusteeReceived(investment, m)

  async function handleSubmit() {
    setError(null)

    try {
      setSubmitting(true)
      await submitInvestorDecision(gameId, matchId, investment)
      onDecisionMade()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision')
    } finally {
      setSubmitting(false)
    }
  }

  // Generate investment options based on UNIT step size
  const options: number[] = []
  for (let i = 0; i <= E1; i += UNIT) {
    options.push(i)
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title">Investor Decision</h2>

        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <p className="font-medium">You are the Investor</p>
            <p className="text-sm">Decide how much of your endowment to invest. Your investment will be multiplied by {m}.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">Your Endowment</div>
              <div className="stat-value text-primary">{E1.toLocaleString()}</div>
              <div className="stat-desc">tokens to invest</div>
            </div>

            <div className="stat">
              <div className="stat-title">Multiplier</div>
              <div className="stat-value text-secondary">x{m}</div>
              <div className="stat-desc">Applied to investment</div>
            </div>
          </div>

          <div className="divider">Make Your Decision</div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">How much do you want to invest?</span>
            </label>

            {options.length <= 10 ? (
              // Show as buttons if few options
              <div className="grid grid-cols-3 gap-2">
                {options.map((amount) => (
                  <button
                    key={amount}
                    className={`btn ${investment === amount ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setInvestment(amount)}
                    disabled={submitting}
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>
            ) : (
              // Show as range slider if many options
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={E1}
                  step={UNIT}
                  value={investment}
                  onChange={(e) => setInvestment(Number(e.target.value))}
                  className="range range-primary"
                  disabled={submitting}
                />
                <div className="flex justify-between text-xs text-base-content/60">
                  <span>0</span>
                  <span className="font-bold text-base text-primary">{investment.toLocaleString()}</span>
                  <span>{E1.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-base-200 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Preview:</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>You invest:</span>
                <span className="font-medium">{investment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>You keep:</span>
                <span className="font-medium">{refund.toLocaleString()}</span>
              </div>
              <div className="divider my-1"></div>
              <div className="flex justify-between">
                <span>Trustee receives (x{m}):</span>
                <span className="font-medium text-secondary">{trusteeReceives.toLocaleString()}</span>
              </div>
              <p className="text-xs text-base-content/60 mt-2">
                The Trustee will then decide how much to return to you.
              </p>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="card-actions justify-end">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Submitting...
                </>
              ) : (
                'Submit Investment Decision'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
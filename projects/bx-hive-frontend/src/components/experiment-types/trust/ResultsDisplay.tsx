interface ResultsDisplayProps {
  E1: number
  E2: number
  m: number
  investorDecision: number
  trusteeDecision: number
  investorPayout: number
  trusteePayout: number
  isInvestor: boolean
}

export default function ResultsDisplay({
  E1,
  E2,
  m,
  investorDecision,
  trusteeDecision,
  investorPayout,
  trusteePayout,
  isInvestor,
}: ResultsDisplayProps) {
  const received = investorDecision * m
  const yourPayout = isInvestor ? investorPayout : trusteePayout
  const partnerPayout = isInvestor ? trusteePayout : investorPayout

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title">Experiment Complete</h2>

        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <p className="font-medium">You were the {isInvestor ? 'Investor' : 'Trustee'}</p>
            <p className="text-sm">The experiment has ended. See results below.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">Your Payout</div>
              <div className="stat-value text-success">{yourPayout.toLocaleString()}</div>
              <div className="stat-desc">{isInvestor ? 'Investor' : 'Trustee'}</div>
            </div>

            <div className="stat">
              <div className="stat-title">Partner's Payout</div>
              <div className="stat-value">{partnerPayout.toLocaleString()}</div>
              <div className="stat-desc">{isInvestor ? 'Trustee' : 'Investor'}</div>
            </div>
          </div>

          <div className="bg-base-200 p-4 rounded-lg">
            <h3 className="font-semibold text-sm mb-3">Experiment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Investor endowment (E1):</span>
                <span className="font-medium">{E1.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Trustee endowment (E2):</span>
                <span className="font-medium">{E2.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Multiplier:</span>
                <span className="font-medium">x{m}</span>
              </div>

              <div className="divider my-2"></div>

              <div className="flex justify-between">
                <span>Investor sent:</span>
                <span className="font-medium">{investorDecision.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Trustee received (x{m}):</span>
                <span className="font-medium">{received.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Trustee returned:</span>
                <span className="font-medium">{trusteeDecision.toLocaleString()}</span>
              </div>

              <div className="divider my-2"></div>

              <div className="flex justify-between font-semibold">
                <span>Investor final payout:</span>
                <span className={isInvestor ? 'text-success' : ''}>{investorPayout.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Trustee final payout:</span>
                <span className={!isInvestor ? 'text-success' : ''}>{trusteePayout.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
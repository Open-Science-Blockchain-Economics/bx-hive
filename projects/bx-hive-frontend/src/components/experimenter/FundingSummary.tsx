import { getVariationLabel } from '../../db'
import type { ParameterVariation } from '../../types'
import { computeEscrowAlgo, computeMatchMbrAlgo, generateVariationCombinations } from '../../utils/trustGameCalc'

interface FundingSummaryProps {
  parameters: Record<string, number | string>
  variations: ParameterVariation[]
  batchModeEnabled: boolean
  maxPerVariation: string
  walletBalanceAlgo: number | null
}

export default function FundingSummary({
  parameters,
  variations,
  batchModeEnabled,
  maxPerVariation,
  walletBalanceAlgo,
}: FundingSummaryProps) {
  const maxSub = Number(maxPerVariation)
  if (!maxPerVariation || maxSub < 2) return null

  const combos =
    batchModeEnabled && variations.length > 0 && variations.every((v) => v.values.length > 0)
      ? generateVariationCombinations(parameters, variations)
      : [parameters]

  const matchMbrPerVar = computeMatchMbrAlgo(maxSub)
  const rows = combos.map((combo, i) => ({
    label: batchModeEnabled ? getVariationLabel(combo, variations) : 'Default',
    escrow: computeEscrowAlgo(combo, maxSub),
    matchMbr: matchMbrPerVar,
    index: i,
  }))
  const totalEscrow = rows.reduce((sum, r) => sum + r.escrow, 0)
  const totalMatchMbr = rows.reduce((sum, r) => sum + r.matchMbr, 0)
  const total = totalEscrow + totalMatchMbr

  return (
    <>
      <div className="divider"></div>
      <div>
        <h4 className="font-semibold mb-3">Funding Summary</h4>
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Variation</th>
                <th className="text-right">Escrow (ALGO)</th>
                <th className="text-right">Match MBR (ALGO)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.index}>
                  <td>{row.label}</td>
                  <td className="text-right">{row.escrow}</td>
                  <td className="text-right">{row.matchMbr.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td>Total</td>
                <td className="text-right">{totalEscrow} ALGO</td>
                <td className="text-right">{totalMatchMbr.toFixed(4)} ALGO</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="text-xs text-base-content/60 mt-2">
          Escrow funds payouts to players. Match MBR (0.0883 ALGO/match) covers on-chain storage and is paid when matches are created.
          Subjects pay 0.0169 ALGO each on self-enrollment.
        </div>
        {walletBalanceAlgo !== null && total > walletBalanceAlgo ? (
          <div className="alert alert-error mt-3">
            <span className="text-sm">
              Insufficient balance. You need <strong>{total.toFixed(4)} ALGO</strong> total but your wallet only has{' '}
              <strong>{walletBalanceAlgo.toFixed(2)} ALGO</strong>. Add funds before creating this experiment.
            </span>
          </div>
        ) : (
          <div className="alert alert-info mt-3">
            <span className="text-sm">
              Your wallet will be charged <strong>{totalEscrow} ALGO</strong> escrow at creation. Match MBR (
              <strong>{totalMatchMbr.toFixed(4)} ALGO</strong>) is charged per match when matches are created.
            </span>
          </div>
        )}
      </div>
    </>
  )
}

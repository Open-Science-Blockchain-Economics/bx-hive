import AssetIcon from '@/components/AssetIcon'
import { cn } from '@/lib/utils'
import { getVariationLabel } from '../../db'
import type { AssetMetadata } from '../../hooks/useAssetMetadata'
import type { ParameterVariation } from '../../types'
import { computeEscrowWhole, computeMatchMbrAlgo, generateVariationCombinations } from '../../utils/trustGameCalc'

interface FundingSummaryProps {
  parameters: Record<string, number | string>
  variations: ParameterVariation[]
  batchModeEnabled: boolean
  maxPerVariation: string
  walletBalanceAlgo: number | null
  /** Payout asset selected in the picker. */
  payoutAsset: AssetMetadata
}

export default function FundingSummary({
  parameters,
  variations,
  batchModeEnabled,
  maxPerVariation,
  walletBalanceAlgo,
  payoutAsset,
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
    escrow: computeEscrowWhole(combo, maxSub),
    matchMbr: matchMbrPerVar,
    index: i,
  }))
  const totalEscrow = rows.reduce((sum, r) => sum + r.escrow, 0)
  const totalMatchMbr = rows.reduce((sum, r) => sum + r.matchMbr, 0)
  const isAlgo = payoutAsset.assetId === 0n
  // The wallet's ALGO balance must cover MBR (always) plus escrow (only when
  // escrow is in ALGO). For ASA experiments, the experimenter is responsible
  // for holding sufficient ASA balance separately.
  const algoRequired = isAlgo ? totalEscrow + totalMatchMbr : totalMatchMbr
  const insufficient = walletBalanceAlgo !== null && algoRequired > walletBalanceAlgo

  return (
    <div className="mt-6">
      <h4 className="t-h2 mb-3">Funding Summary</h4>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left t-micro px-3 py-2">Variation</th>
              <th className="text-right t-micro px-3 py-2">
                <span className="inline-flex items-center justify-end gap-1.5">
                  Escrow ({payoutAsset.unitName})
                  <AssetIcon assetId={payoutAsset.assetId} unitName={payoutAsset.unitName} className="size-3" />
                </span>
              </th>
              <th className="text-right t-micro px-3 py-2">Match MBR (ALGO)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.index} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2">{row.label}</td>
                <td className="text-right font-mono px-3 py-2">{row.escrow}</td>
                <td className="text-right font-mono px-3 py-2">{row.matchMbr.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="text-right font-mono px-3 py-2">
                {totalEscrow} {payoutAsset.unitName}
              </td>
              <td className="text-right font-mono px-3 py-2">{totalMatchMbr.toFixed(4)} ALGO</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Escrow funds payouts to players in {payoutAsset.unitName}. Match MBR (0.0883 ALGO/match) covers on-chain storage and is paid in ALGO
        regardless of payout asset. Participants pay 0.0169 ALGO each on self-enrollment.
      </p>
      <div
        role="alert"
        className={cn(
          'mt-3 rounded-sm border px-3 py-2.5 text-sm',
          insufficient ? 'border-neg/35 bg-neg-bg text-neg' : 'border-info/35 bg-info-bg text-info',
        )}
      >
        {insufficient ? (
          <>
            Insufficient ALGO balance. You need <strong>{algoRequired.toFixed(4)} ALGO</strong> in your wallet but only have{' '}
            <strong>{walletBalanceAlgo!.toFixed(2)} ALGO</strong>. Add funds before creating this experiment.
          </>
        ) : isAlgo ? (
          <>
            Your wallet will be charged <strong>{totalEscrow} ALGO</strong> escrow at creation. Match MBR (
            <strong>{totalMatchMbr.toFixed(4)} ALGO</strong>) is charged per match when matches are created.
          </>
        ) : (
          <>
            Your wallet will be charged{' '}
            <strong>
              {totalEscrow} {payoutAsset.unitName}
            </strong>{' '}
            escrow plus <strong>{totalMatchMbr.toFixed(4)} ALGO</strong> MBR at creation. Make sure you hold enough {payoutAsset.unitName}{' '}
            before submitting.
          </>
        )}
      </div>
    </div>
  )
}

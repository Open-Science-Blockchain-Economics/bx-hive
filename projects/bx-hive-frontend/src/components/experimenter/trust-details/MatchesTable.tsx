import { ExternalLink } from 'lucide-react'

import { Chip } from '@/components/ds/badge'
import { PHASE_COMPLETED } from '../../../hooks/useTrustVariation'
import type { Match } from '../../../hooks/useTrustVariation'
import { truncateAddress } from '../../../utils/address'
import AssetIcon from '../../AssetIcon'
import { baseUnitsToWhole } from '../../../utils/amount'
import { loraAccountUrl } from '../../../utils/lora'

interface MatchesTableProps {
  matches: Match[]
  /** Decimals of the variation's payout asset (6 for ALGO/USDC). */
  decimals: number
  /** Unit name of the variation's payout asset (e.g. "ALGO", "USDC"). */
  unitName: string
  /** Asset id (0n for native ALGO). */
  assetId: bigint
}

function AddrLink({ address }: { address: string }) {
  return (
    <a
      href={loraAccountUrl('localnet', address)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-ink-2 hover:text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline"
    >
      {truncateAddress(address)}
      <ExternalLink className="size-3" />
    </a>
  )
}

export default function MatchesTable({ matches, decimals, unitName, assetId }: MatchesTableProps) {
  const renderPayoutCell = (amount: bigint, completed: boolean) =>
    completed ? (
      <span className="inline-flex items-center justify-end gap-1.5">
        {baseUnitsToWhole(amount, decimals).toFixed(3)} {unitName}
        <AssetIcon assetId={assetId} unitName={unitName} className="size-3.5" />
      </span>
    ) : (
      '—'
    )

  return (
    <div>
      <h3 className="t-h2 mb-3">Matches ({matches.length})</h3>
      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches created yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left t-micro px-3 py-2">#</th>
                <th className="text-left t-micro px-3 py-2">Investor</th>
                <th className="text-left t-micro px-3 py-2">Trustee</th>
                <th className="text-left t-micro px-3 py-2">Phase</th>
                <th className="text-right t-micro px-3 py-2">Investor Payout</th>
                <th className="text-right t-micro px-3 py-2">Trustee Payout</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.matchId} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs">{m.matchId}</td>
                  <td className="px-3 py-2">
                    <AddrLink address={m.investor} />
                  </td>
                  <td className="px-3 py-2">
                    <AddrLink address={m.trustee} />
                  </td>
                  <td className="px-3 py-2">
                    {m.phase === PHASE_COMPLETED ? (
                      <Chip tone="pos">Completed</Chip>
                    ) : m.phase === 1 ? (
                      <Chip tone="info">Trustee deciding</Chip>
                    ) : (
                      <Chip tone="info">Investor deciding</Chip>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{renderPayoutCell(m.investorPayout, m.phase === PHASE_COMPLETED)}</td>
                  <td className="px-3 py-2 text-right font-mono">{renderPayoutCell(m.trusteePayout, m.phase === PHASE_COMPLETED)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

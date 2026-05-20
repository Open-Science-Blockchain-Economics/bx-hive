import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import FundingSummary from './FundingSummary'
import type { AssetMetadata } from '../../hooks/useAssetMetadata'

const ALGO: AssetMetadata = { assetId: 0n, decimals: 6, unitName: 'ALGO', name: 'Algorand', total: 0n }
const USDC: AssetMetadata = { assetId: 31566704n, decimals: 6, unitName: 'USDC', name: 'USD Coin', total: 0n }

// E1=10, E2=0, m=2, UNIT=1, maxSub=2 → 2 max-payout slots × 10 = 20 escrow whole units.
const PARAMS = { E1: 10, E2: 0, m: 2, UNIT: 1 }
const MAX_PER_VARIATION = '2' // FundingSummary requires maxSub >= 2; with E1=10, m=2 → escrow = 20 whole units.

describe('FundingSummary', () => {
  it('shows the friendly ALGO info banner when wallet has enough ALGO', () => {
    render(
      <FundingSummary
        parameters={PARAMS}
        variations={[]}
        batchModeEnabled={false}
        maxPerVariation={MAX_PER_VARIATION}
        walletBalanceAlgo={1_000}
        payoutAsset={ALGO}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/Your wallet will be charged/i)
    expect(screen.queryByText(/Insufficient/i)).not.toBeInTheDocument()
  })

  it('shows the insufficient-ALGO warning when wallet ALGO is short', () => {
    render(
      <FundingSummary
        parameters={PARAMS}
        variations={[]}
        batchModeEnabled={false}
        maxPerVariation={MAX_PER_VARIATION}
        walletBalanceAlgo={0.0001}
        payoutAsset={ALGO}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/Insufficient ALGO balance/i)
  })

  it('shows the insufficient-asset warning for USDC when wallet asset balance is short', () => {
    render(
      <FundingSummary
        parameters={PARAMS}
        variations={[]}
        batchModeEnabled={false}
        maxPerVariation={MAX_PER_VARIATION}
        walletBalanceAlgo={1_000}
        payoutAsset={USDC}
        walletAssetBalance={5}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/Insufficient USDC balance/i)
    expect(alert).toHaveTextContent(/5\.00 USDC/i)
    expect(alert).toHaveTextContent(/20 USDC/i)
  })

  it('shows the friendly USDC info banner when wallet has enough of the asset', () => {
    render(
      <FundingSummary
        parameters={PARAMS}
        variations={[]}
        batchModeEnabled={false}
        maxPerVariation={MAX_PER_VARIATION}
        walletBalanceAlgo={1_000}
        payoutAsset={USDC}
        walletAssetBalance={1_000}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/escrow plus/i)
    expect(alert).not.toHaveTextContent(/Insufficient/i)
  })

  it('does not warn about asset balance while it is still loading (null)', () => {
    render(
      <FundingSummary
        parameters={PARAMS}
        variations={[]}
        batchModeEnabled={false}
        maxPerVariation={MAX_PER_VARIATION}
        walletBalanceAlgo={1_000}
        payoutAsset={USDC}
        walletAssetBalance={null}
      />,
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(/Insufficient/i)
  })

  it('prioritizes the ALGO warning when both ALGO and asset balances are short', () => {
    render(
      <FundingSummary
        parameters={PARAMS}
        variations={[]}
        batchModeEnabled={false}
        maxPerVariation={MAX_PER_VARIATION}
        walletBalanceAlgo={0.0001}
        payoutAsset={USDC}
        walletAssetBalance={0}
      />,
    )
    // Only one warning surface; ALGO comes first because the MBR is required regardless of asset.
    expect(screen.getByRole('alert')).toHaveTextContent(/Insufficient ALGO balance/i)
  })
})

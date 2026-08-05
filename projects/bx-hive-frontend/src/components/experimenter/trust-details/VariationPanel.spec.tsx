import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import VariationPanel from './VariationPanel'
import { TooltipProvider } from '@/components/ds/tooltip'
import type { VariationInfo } from '../../../hooks/useTrustExperiments'
import { STATUS_ACTIVE, STATUS_CLOSED, STATUS_COMPLETED } from '../../../hooks/useTrustVariation'
import type { VariationConfig } from '../../../hooks/useTrustVariation'

vi.mock('../../../hooks/useAssetMetadata', () => ({
  useAssetMetadata: () => ({ assetId: 0n, decimals: 6, unitName: 'ALGO', name: 'Algorand', total: 0n }),
}))

function renderInProvider(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

const VARIATION: VariationInfo = { varId: 0, appId: 1077n, label: 'Baseline', createdAt: 1_700_000_000n }

function makeConfig(status: number): VariationConfig {
  return { e1: 1_000_000n, e2: 0n, multiplier: 3n, unit: 100_000n, assetId: 0n, status, maxParticipants: 0n }
}

const PARTICIPANTS = [
  { address: 'A'.repeat(58), enrolled: 1, assigned: 0 },
  { address: 'B'.repeat(58), enrolled: 1, assigned: 0 },
]

function renderPanel(status: number) {
  return renderInProvider(
    <VariationPanel
      variation={VARIATION}
      participants={PARTICIPANTS}
      matches={[]}
      config={makeConfig(status)}
      isOwner
      onCreateMatch={vi.fn()}
      onCloseRegistration={vi.fn()}
      onReopenRegistration={vi.fn()}
      onEndVariation={vi.fn()}
      onGetEscrowBalance={vi.fn()}
    />,
  )
}

describe('VariationPanel', () => {
  it('offers match creation while the variation is active', () => {
    renderPanel(STATUS_ACTIVE)
    expect(screen.getByRole('heading', { name: 'Create Match' })).toBeInTheDocument()
  })

  it('still offers match creation once registration is closed', () => {
    // close_registration only blocks new enrolments; create_match has no status check,
    // so closing must not strand participants who enrolled before it.
    renderPanel(STATUS_CLOSED)
    expect(screen.getByRole('heading', { name: 'Create Match' })).toBeInTheDocument()
  })

  it('withdraws match creation once the variation has ended', () => {
    renderPanel(STATUS_COMPLETED)
    expect(screen.queryByRole('heading', { name: 'Create Match' })).not.toBeInTheDocument()
  })
})

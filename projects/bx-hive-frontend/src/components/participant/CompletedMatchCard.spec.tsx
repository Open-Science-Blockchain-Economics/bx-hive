import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import CompletedMatchCard from './CompletedMatchCard'
import type { ExperimentGroup, VariationInfo } from '@/hooks/useTrustExperiments'
import { PHASE_COMPLETED, STATUS_COMPLETED } from '@/hooks/useTrustVariation'
import type { Match, VariationConfig } from '@/hooks/useTrustVariation'

// useAssetMetadata depends on NetworkProvider + QueryClient; stub the synthetic
// ALGO response so this component test can stay focused on layout.
vi.mock('@/hooks/useAssetMetadata', () => ({
  useAssetMetadata: () => ({ assetId: 0n, decimals: 6, unitName: 'ALGO', name: 'Algorand', total: 0n }),
}))

const ACTIVE_ADDRESS = 'A'.repeat(58)

const group: ExperimentGroup = {
  expId: 0,
  owner: 'B'.repeat(58),
  name: 'Pilot',
  createdAt: 0n,
  variationCount: 1n,
}

const variation: VariationInfo = { varId: 0, appId: 1001n, label: 'Baseline', createdAt: 0n }

const config: VariationConfig = {
  e1: 1_000_000n,
  e2: 0n,
  multiplier: 3n,
  unit: 100_000n,
  assetId: 0n,
  status: STATUS_COMPLETED,
  maxParticipants: 0n,
}

const match: Match = {
  matchId: 1,
  investor: ACTIVE_ADDRESS,
  trustee: 'C'.repeat(58),
  phase: PHASE_COMPLETED,
  createdAt: 0n,
  investment: 300_000n,
  returnAmount: 400_000n,
  investorPayout: 1_100_000n,
  trusteePayout: 500_000n,
  completedAt: 0n,
  paidOut: 1,
}

function renderCard() {
  return render(
    <MemoryRouter>
      <CompletedMatchCard group={group} variation={variation} config={config} match={match} activeAddress={ACTIVE_ADDRESS} />
    </MemoryRouter>,
  )
}

describe('CompletedMatchCard', () => {
  it('identifies the experiment by the name its experimenter chose, not by the game type', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Pilot' })).toBeInTheDocument()
    expect(screen.queryByText(/Trust Game/i)).not.toBeInTheDocument()
  })

  it('shows the payout owed to the connected wallet', () => {
    renderCard()

    expect(screen.getByText(/1\.1 ALGO/)).toBeInTheDocument()
  })
})

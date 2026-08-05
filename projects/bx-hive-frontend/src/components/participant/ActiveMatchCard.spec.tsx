import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import ActiveMatchCard from './ActiveMatchCard'
import type { ExperimentGroup, VariationInfo } from '@/hooks/useTrustExperiments'
import { PHASE_INVESTOR_DECISION, STATUS_ACTIVE } from '@/hooks/useTrustVariation'
import type { Match, VariationConfig } from '@/hooks/useTrustVariation'

const ACTIVE_ADDRESS = 'A'.repeat(58)

const group: ExperimentGroup = {
  expId: 0,
  owner: 'B'.repeat(58),
  name: 'Pilot',
  createdAt: 0n,
  variationCount: 1n,
  investorLabel: 'Investor',
  trusteeLabel: 'Trustee',
}

const variation: VariationInfo = { varId: 0, appId: 1001n, label: 'Baseline', createdAt: 0n }

const config: VariationConfig = {
  e1: 1_000_000n,
  e2: 0n,
  multiplier: 3n,
  unit: 100_000n,
  assetId: 0n,
  status: STATUS_ACTIVE,
  maxParticipants: 0n,
}

const match: Match = {
  matchId: 1,
  investor: ACTIVE_ADDRESS,
  trustee: 'C'.repeat(58),
  phase: PHASE_INVESTOR_DECISION,
  createdAt: 0n,
  investment: 0n,
  returnAmount: 0n,
  investorPayout: 0n,
  trusteePayout: 0n,
  completedAt: 0n,
  paidOut: 0,
}

function renderCard() {
  return render(
    <MemoryRouter>
      <ActiveMatchCard group={group} variation={variation} config={config} match={match} activeAddress={ACTIVE_ADDRESS} />
    </MemoryRouter>,
  )
}

describe('ActiveMatchCard', () => {
  it('identifies the experiment by the name its experimenter chose, not by the game type', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Pilot' })).toBeInTheDocument()
    expect(screen.queryByText(/Trust Game/i)).not.toBeInTheDocument()
  })

  it('names the role the connected wallet holds in the match', () => {
    renderCard()

    expect(screen.getByText('Investor')).toBeInTheDocument()
  })
})

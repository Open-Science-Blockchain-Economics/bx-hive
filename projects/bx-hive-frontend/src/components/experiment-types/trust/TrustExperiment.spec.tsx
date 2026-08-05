import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import TrustExperiment from './TrustExperiment'
import type { Match, VariationConfig } from '@/hooks/useTrustVariation'
import { PHASE_INVESTOR_DECISION, PHASE_TRUSTEE_DECISION, STATUS_ACTIVE } from '@/hooks/useTrustVariation'
import { DEFAULT_ROLE_LABELS } from '@/utils/roleLabels'

vi.mock('../../../hooks/useAssetMetadata', () => ({
  useAssetMetadata: () => ({ assetId: 0n, decimals: 6, unitName: 'ALGO', name: 'Algorand', total: 0n }),
}))

const INVESTOR = 'A'.repeat(58)
const TRUSTEE = 'B'.repeat(58)

const config: VariationConfig = {
  e1: 10_000_000n,
  e2: 0n,
  multiplier: 3n,
  unit: 2_000_000n,
  assetId: 0n,
  status: STATUS_ACTIVE,
  maxParticipants: 0n,
}

const match: Match = {
  matchId: 1,
  investor: INVESTOR,
  trustee: TRUSTEE,
  phase: PHASE_INVESTOR_DECISION,
  createdAt: 0n,
  investment: 4_000_000n,
  returnAmount: 0n,
  investorPayout: 0n,
  trusteePayout: 0n,
  completedAt: 0n,
  paidOut: 0,
}

const customLabels = { investorLabel: 'Decision Maker 1', trusteeLabel: 'Decision Maker 2' }

function renderWaiting(matchOverrides: Partial<Match>, activeAddress: string, roleLabels = DEFAULT_ROLE_LABELS) {
  return render(
    <TrustExperiment
      appId={1001n}
      match={{ ...match, ...matchOverrides }}
      config={config}
      activeAddress={activeAddress}
      roleLabels={roleLabels}
      dataUpdatedAt={Date.now()}
      refreshIntervalMs={5000}
      onRefresh={vi.fn()}
    />,
  )
}

describe('TrustExperiment waiting states', () => {
  it('names the role being waited on with the experimenter label', () => {
    renderWaiting({ phase: PHASE_INVESTOR_DECISION }, TRUSTEE, customLabels)

    expect(screen.getByRole('heading', { name: 'Waiting for Decision Maker 1' })).toBeInTheDocument()
    expect(screen.getByText('They are deciding how much to send you.')).toBeInTheDocument()
  })

  it('names the responding role with the experimenter label', () => {
    renderWaiting({ phase: PHASE_TRUSTEE_DECISION }, INVESTOR, customLabels)

    expect(screen.getByRole('heading', { name: 'Waiting for Decision Maker 2' })).toBeInTheDocument()
    // 4 ALGO sent, x3 multiplier.
    expect(screen.getByText(/They received/)).toHaveTextContent('12 ALGO')
  })

  it('falls back to the canonical role names when the experiment carries no labels', () => {
    renderWaiting({ phase: PHASE_INVESTOR_DECISION }, TRUSTEE)

    expect(screen.getByRole('heading', { name: 'Waiting for Investor' })).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import VariationConfigCard from './VariationConfigCard'
import { TooltipProvider } from '@/components/ds/tooltip'
import type { VariationConfig } from '../../../hooks/useTrustVariation'

function renderInProvider(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

function makeConfig(overrides: Partial<VariationConfig> = {}): VariationConfig {
  return {
    e1: 1_000_000n,
    e2: 500_000n,
    multiplier: 3n,
    unit: 100_000n,
    assetId: 0n,
    status: 0,
    maxParticipants: 0n,
    ...overrides,
  }
}

describe('VariationConfigCard', () => {
  it('renders only the Parameters label and Lora link when config is undefined', () => {
    renderInProvider(<VariationConfigCard config={undefined} appId={42n} participantCount={0} />)

    expect(screen.getByRole('heading', { name: /Parameters/i })).toBeInTheDocument()
    expect(screen.queryByText(/Capacity/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('renders the Capacity tile with X / ∞ and "unlimited" when maxParticipants is 0', () => {
    renderInProvider(<VariationConfigCard config={makeConfig({ maxParticipants: 0n })} appId={42n} participantCount={4} />)

    expect(screen.getByText('Capacity')).toBeInTheDocument()
    expect(screen.getByText('4 / ∞')).toBeInTheDocument()
    expect(screen.getByText('unlimited')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('renders the Capacity tile with X / Y and a progress bar when maxParticipants > 0', () => {
    renderInProvider(<VariationConfigCard config={makeConfig({ maxParticipants: 50n })} appId={42n} participantCount={12} />)

    expect(screen.getByText('12 / 50')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '24') // 12/50 = 24%
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps the progress bar to 100% when participantCount exceeds maxParticipants', () => {
    // add_participants bypasses max_participants by design — the value is shown
    // honestly but the bar is capped so it doesn't visually overflow.
    renderInProvider(<VariationConfigCard config={makeConfig({ maxParticipants: 2n })} appId={42n} participantCount={3} />)

    expect(screen.getByText('3 / 2')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('still renders the four base parameter tiles alongside Capacity', () => {
    renderInProvider(<VariationConfigCard config={makeConfig({ multiplier: 3n })} appId={42n} participantCount={0} />)

    expect(screen.getByText('E1 Endowment')).toBeInTheDocument()
    expect(screen.getByText('E2 Endowment')).toBeInTheDocument()
    expect(screen.getByText('Multiplier')).toBeInTheDocument()
    expect(screen.getByText('Unit Size')).toBeInTheDocument()
    expect(screen.getByText('×3')).toBeInTheDocument()
  })
})

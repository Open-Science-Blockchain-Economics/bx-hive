import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import DebugInfo, { DebugTooltip, debugRows } from './DebugInfo'
import { TooltipProvider } from '@/components/ds/tooltip'
import type { ExperimentGroup, VariationInfo } from '@/hooks/useTrustExperiments'
import { PHASE_COMPLETED, PHASE_TRUSTEE_DECISION, STATUS_ACTIVE, STATUS_CLOSED } from '@/hooks/useTrustVariation'
import type { Match, VariationConfig } from '@/hooks/useTrustVariation'

const group: ExperimentGroup = {
  expId: 7,
  owner: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  name: 'Pilot',
  createdAt: 0n,
  variationCount: 2n,
}

const variation: VariationInfo = { varId: 0, appId: 1001n, label: 'Baseline', createdAt: 0n }

const config: VariationConfig = {
  e1: 10n,
  e2: 0n,
  multiplier: 3n,
  unit: 1n,
  assetId: 0n,
  status: STATUS_ACTIVE,
  maxParticipants: 0n,
}

const match: Match = {
  matchId: 4,
  investor: 'INVESTOR',
  trustee: 'TRUSTEE',
  phase: PHASE_TRUSTEE_DECISION,
  createdAt: 0n,
  investment: 0n,
  returnAmount: 0n,
  investorPayout: 0n,
  trusteePayout: 0n,
  completedAt: 0n,
  paidOut: 0,
}

describe('debugRows', () => {
  it('pads the experiment id and pairs it with the experiment name', () => {
    expect(debugRows({ group })).toEqual([
      ['Experiment', 'EXP-0007'],
      ['Name', 'Pilot'],
    ])
  })

  it('lists every variation with its label and app id', () => {
    const rows = debugRows({ variations: [variation, { varId: 1, appId: 1002n, label: 'Treatment', createdAt: 0n }] })
    expect(rows).toEqual([
      ['Variation', 'Baseline #1001'],
      ['Variation', 'Treatment #1002'],
    ])
  })

  it('falls back to a bare app id when no VariationInfo is supplied', () => {
    expect(debugRows({ appId: 1001n })).toEqual([['Variation app', '#1001']])
  })

  it('labels the variation status from the config', () => {
    expect(debugRows({ config: { ...config, status: STATUS_CLOSED } })).toEqual([['Status', 'Closed']])
  })

  it('adds the match id and a phase label', () => {
    expect(debugRows({ match })).toEqual([
      ['Match', '#4'],
      ['Phase', 'Trustee deciding'],
    ])
    expect(debugRows({ match: { ...match, phase: PHASE_COMPLETED } })).toContainEqual(['Phase', 'Completed'])
  })

  it('returns no rows when nothing is known', () => {
    expect(debugRows({})).toEqual([])
  })
})

describe('DebugTooltip', () => {
  it('renders a trigger that reveals every row on hover', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <DebugTooltip group={group} variations={[variation]} config={config} match={match} />
      </TooltipProvider>,
    )

    const trigger = screen.getByRole('button', { name: 'Debug info' })
    await user.hover(trigger)
    // Radix mirrors the content into a visually-hidden copy for screen readers,
    // so every row matches twice; read the rows off the first copy in order.
    await screen.findAllByText('EXP-0007')

    const rows = document.querySelector('[data-slot="tooltip-content"] div')!
    expect(Array.from(rows.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      'Experiment: EXP-0007',
      'Name: Pilot',
      'Variation: Baseline #1001',
      'Status: Active',
      'Match: #4',
      'Phase: Trustee deciding',
    ])
  })

  it('renders nothing when there is nothing to show', () => {
    const { container } = render(
      <TooltipProvider>
        <DebugTooltip />
      </TooltipProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DebugInfo', () => {
  // vitest.config.ts leaves MODE at 'test', so the production gate is closed here
  // and only DebugTooltip above exercises the render path.
  it('renders nothing outside development mode', () => {
    expect(import.meta.env.MODE).not.toBe('development')

    const { container } = render(
      <TooltipProvider>
        <DebugInfo group={group} variations={[variation]} config={config} match={match} />
      </TooltipProvider>,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: 'Debug info' })).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ResultsDisplay from './ResultsDisplay'
import { DEFAULT_ROLE_LABELS } from '../../../utils/roleLabels'

// E1=100, E2=200 (distinct so number matches are unambiguous).
// Canonical values from the investor-sends-30, trustee-returns-40 scenario.
const baseProps = {
  E1: 100,
  E2: 200,
  m: 3,
  investorDecision: 30,
  trusteeDecision: 40,
  investorPayout: 110, // 100 - 30 + 40
  trusteePayout: 250, // 200 + (90 - 40)
  roleLabels: DEFAULT_ROLE_LABELS,
}

const customLabels = { investorLabel: 'Decision Maker 1', trusteeLabel: 'Decision Maker 2' }

describe('ResultsDisplay', () => {
  it('identifies the viewer as the Investor when isInvestor is true', () => {
    render(<ResultsDisplay {...baseProps} isInvestor />)
    expect(screen.getByText('Your role: Investor')).toBeInTheDocument()
  })

  it('identifies the viewer as the Trustee when isInvestor is false', () => {
    render(<ResultsDisplay {...baseProps} isInvestor={false} />)
    expect(screen.getByText('Your role: Trustee')).toBeInTheDocument()
  })

  it('names both roles with the labels the experimenter chose', () => {
    render(<ResultsDisplay {...baseProps} isInvestor roleLabels={customLabels} />)

    expect(screen.getByText('Your role: Decision Maker 1')).toBeInTheDocument()
    expect(screen.getByText('Decision Maker 1 endowment (E1):')).toBeInTheDocument()
    expect(screen.getByText('Decision Maker 2 endowment (E2):')).toBeInTheDocument()
    expect(screen.getByText('Decision Maker 1 sent:')).toBeInTheDocument()
    expect(screen.getByText(/Decision Maker 2 received \(x3\):/)).toBeInTheDocument()
    expect(screen.getByText('Decision Maker 2 returned:')).toBeInTheDocument()
    expect(screen.getByText('Decision Maker 1 final payout:')).toBeInTheDocument()
    expect(screen.getByText('Decision Maker 2 final payout:')).toBeInTheDocument()
    expect(screen.queryByText(/Investor|Trustee/)).not.toBeInTheDocument()
  })

  it('labels the payout cards with the viewer role and its counterpart', () => {
    render(<ResultsDisplay {...baseProps} isInvestor={false} roleLabels={customLabels} />)

    // Viewer is the trustee, so their own card carries the trustee label.
    expect(screen.getByText('Your Payout').parentElement).toHaveTextContent('Decision Maker 2')
    expect(screen.getByText("Partner's Payout").parentElement).toHaveTextContent('Decision Maker 1')
  })

  it('shows the summary rows with decisions and the multiplied amount', () => {
    render(<ResultsDisplay {...baseProps} isInvestor />)
    expect(screen.getByText('Investor sent:')).toBeInTheDocument()
    expect(screen.getByText('Trustee returned:')).toBeInTheDocument()
    expect(screen.getByText(/Trustee received \(x3\):/)).toBeInTheDocument()
    // investorDecision=30, trusteeDecision=40, received=90 — all unique in props
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument()
  })

  it('renders both final payouts regardless of which side is viewing', () => {
    render(<ResultsDisplay {...baseProps} isInvestor />)
    // Both payouts should be visible; values 110 and 250 appear in both the stats block
    // and the summary, so expect >= 1 occurrence of each.
    expect(screen.getAllByText('110').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('250').length).toBeGreaterThanOrEqual(1)
  })
})

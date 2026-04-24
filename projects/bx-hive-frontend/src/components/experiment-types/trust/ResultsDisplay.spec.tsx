import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ResultsDisplay from './ResultsDisplay'

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
}

describe('ResultsDisplay', () => {
  it('identifies the viewer as the Investor when isInvestor is true', () => {
    render(<ResultsDisplay {...baseProps} isInvestor />)
    expect(screen.getByText(/You were the Investor/i)).toBeInTheDocument()
  })

  it('identifies the viewer as the Trustee when isInvestor is false', () => {
    render(<ResultsDisplay {...baseProps} isInvestor={false} />)
    expect(screen.getByText(/You were the Trustee/i)).toBeInTheDocument()
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

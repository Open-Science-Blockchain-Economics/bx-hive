import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InvestorInterface from './InvestorInterface'

const mockSubmitInvestorDecision = vi.fn()

vi.mock('../../../hooks/useTrustVariation', () => ({
  useTrustVariation: () => ({
    submitInvestorDecision: mockSubmitInvestorDecision,
  }),
}))

// Small endowment so options render as buttons (<= 10 options), making
// interaction straightforward without having to drive a range slider.
const buttonsModeProps = {
  appId: 42n,
  matchId: 1,
  E1: 10,
  m: 3,
  UNIT: 2,
  onDecisionMade: vi.fn(),
}

describe('InvestorInterface', () => {
  beforeEach(() => {
    mockSubmitInvestorDecision.mockReset().mockResolvedValue(undefined)
    buttonsModeProps.onDecisionMade = vi.fn()
  })

  it('renders endowment and multiplier from props', () => {
    render(<InvestorInterface {...buttonsModeProps} />)
    expect(screen.getByText(/Your Endowment/)).toBeInTheDocument()
    expect(screen.getByText(/10 ALGO/)).toBeInTheDocument()
    expect(screen.getByText('x3')).toBeInTheDocument()
  })

  it('renders investment options as buttons when <= 10 options exist', () => {
    render(<InvestorInterface {...buttonsModeProps} />)
    // 6 options: 0, 2, 4, 6, 8, 10
    expect(screen.getByRole('button', { name: '0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
  })

  it('updates the preview when an amount is selected', async () => {
    const user = userEvent.setup()
    render(<InvestorInterface {...buttonsModeProps} />)

    await user.click(screen.getByRole('button', { name: '6' }))

    // Invest 6, keep 4, trustee receives 18 (6 * 3)
    expect(screen.getByText('You invest:').nextElementSibling).toHaveTextContent('6')
    expect(screen.getByText('You keep:').nextElementSibling).toHaveTextContent('4')
    expect(screen.getByText(/Trustee receives/).nextElementSibling).toHaveTextContent('18')
  })

  it('submits the decision as microAlgo and calls onDecisionMade on success', async () => {
    const user = userEvent.setup()
    const onDecisionMade = vi.fn()
    render(<InvestorInterface {...buttonsModeProps} onDecisionMade={onDecisionMade} />)

    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /Submit Investment Decision/i }))

    // 4 ALGO = 4_000_000 microAlgo
    expect(mockSubmitInvestorDecision).toHaveBeenCalledWith(42n, 1, 4_000_000n)
    expect(onDecisionMade).toHaveBeenCalledTimes(1)
  })

  it('surfaces the error message when submission fails', async () => {
    const user = userEvent.setup()
    const onDecisionMade = vi.fn()
    mockSubmitInvestorDecision.mockRejectedValueOnce(new Error('chain rejected'))
    render(<InvestorInterface {...buttonsModeProps} onDecisionMade={onDecisionMade} />)

    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: /Submit Investment Decision/i }))

    expect(await screen.findByText('chain rejected')).toBeInTheDocument()
    expect(onDecisionMade).not.toHaveBeenCalled()
  })
})

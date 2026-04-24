import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TrusteeInterface from './TrusteeInterface'

const mockSubmitTrusteeDecision = vi.fn()

vi.mock('../../../hooks/useTrustVariation', () => ({
  useTrustVariation: () => ({
    submitTrusteeDecision: mockSubmitTrusteeDecision,
  }),
}))

// Investor invested 3 ALGO, m=2, so trustee received 6. UNIT=2 gives 4 options (buttons).
const buttonsModeProps = {
  appId: 42n,
  matchId: 1,
  E1: 10,
  E2: 10,
  m: 2,
  UNIT: 2,
  investorDecision: 3,
  onDecisionMade: vi.fn(),
}

describe('TrusteeInterface', () => {
  beforeEach(() => {
    mockSubmitTrusteeDecision.mockReset().mockResolvedValue(undefined)
    buttonsModeProps.onDecisionMade = vi.fn()
  })

  it('shows the investor decision and the multiplied amount received', () => {
    render(<TrusteeInterface {...buttonsModeProps} />)
    // "received" = 3 * 2 = 6
    expect(screen.getByText(/After multiplication \(x2\), you received/)).toBeInTheDocument()
    expect(screen.getByText('You Received')).toBeInTheDocument()
  })

  it('renders return options as buttons when <= 10 options exist', () => {
    render(<TrusteeInterface {...buttonsModeProps} />)
    // 4 options: 0, 2, 4, 6
    expect(screen.getByRole('button', { name: '0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
  })

  it('updates the preview to reflect the return choice', async () => {
    const user = userEvent.setup()
    render(<TrusteeInterface {...buttonsModeProps} />)

    await user.click(screen.getByRole('button', { name: '4' }))

    // Return 4 → trustee keeps 2 of the 6 received
    expect(screen.getByText('You return to Investor:').nextElementSibling).toHaveTextContent('4')
    expect(screen.getByText('You keep from received:').nextElementSibling).toHaveTextContent('2')
  })

  it('submits the return as microAlgo and notifies onDecisionMade', async () => {
    const user = userEvent.setup()
    const onDecisionMade = vi.fn()
    render(<TrusteeInterface {...buttonsModeProps} onDecisionMade={onDecisionMade} />)

    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: /Submit Return Decision/i }))

    // 2 ALGO = 2_000_000 microAlgo
    expect(mockSubmitTrusteeDecision).toHaveBeenCalledWith(42n, 1, 2_000_000n)
    expect(onDecisionMade).toHaveBeenCalledTimes(1)
  })

  it('surfaces the error message when submission fails', async () => {
    const user = userEvent.setup()
    const onDecisionMade = vi.fn()
    mockSubmitTrusteeDecision.mockRejectedValueOnce(new Error('chain rejected'))
    render(<TrusteeInterface {...buttonsModeProps} onDecisionMade={onDecisionMade} />)

    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: /Submit Return Decision/i }))

    expect(await screen.findByText('chain rejected')).toBeInTheDocument()
    expect(onDecisionMade).not.toHaveBeenCalled()
  })
})

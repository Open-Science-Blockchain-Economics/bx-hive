import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import BulkRegistrationButton from './BulkRegistrationButton'
import { TooltipProvider } from '@/components/ds/tooltip'

const OPEN = [1001n, 1002n]
const CLOSED = [1003n]

function renderButton(props: Partial<React.ComponentProps<typeof BulkRegistrationButton>> = {}) {
  const onCloseAll = props.onCloseAll ?? vi.fn().mockResolvedValue(undefined)
  const onOpenAll = props.onOpenAll ?? vi.fn().mockResolvedValue(undefined)
  render(
    <TooltipProvider>
      <BulkRegistrationButton
        openVariationAppIds={OPEN}
        closedVariationAppIds={CLOSED}
        unreadableVariationCount={0}
        isOwner
        {...props}
        onCloseAll={onCloseAll}
        onOpenAll={onOpenAll}
      />
    </TooltipProvider>,
  )
  return { onCloseAll, onOpenAll }
}

describe('BulkRegistrationButton', () => {
  it('renders nothing for someone who does not own the experiment', () => {
    renderButton({ isOwner: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders nothing once every variation has ended', () => {
    renderButton({ openVariationAppIds: [], closedVariationAppIds: [] })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers Close while anything is still open, and closes only the open ones', async () => {
    const user = userEvent.setup()
    const { onCloseAll, onOpenAll } = renderButton()

    const button = screen.getByRole('button', { name: 'Close' })
    await user.click(button)

    expect(onCloseAll).toHaveBeenCalledWith(OPEN)
    expect(onOpenAll).not.toHaveBeenCalled()
  })

  it('offers Open once nothing is open, and opens the closed ones', async () => {
    const user = userEvent.setup()
    const { onCloseAll, onOpenAll } = renderButton({ openVariationAppIds: [] })

    const button = screen.getByRole('button', { name: 'Open' })
    await user.click(button)

    expect(onOpenAll).toHaveBeenCalledWith(CLOSED)
    expect(onCloseAll).not.toHaveBeenCalled()
  })

  it('acts on one click, with no confirmation step', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reports where a partial run stopped and stays clickable', async () => {
    const user = userEvent.setup()
    renderButton({ onCloseAll: vi.fn().mockRejectedValue(new Error('Stopped at app 1002: could not close registration.')) })

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(await screen.findByText(/Stopped at app 1002/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled()
  })
})

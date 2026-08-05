import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import BulkRegistrationButton from './BulkRegistrationButton'
import { TooltipProvider } from '@/components/ds/tooltip'

const OPEN = [1001n, 1002n]
const CLOSED = [1003n]

function renderButton(props: Partial<React.ComponentProps<typeof BulkRegistrationButton>> = {}) {
  const onCloseAll = props.onCloseAll ?? vi.fn().mockResolvedValue(undefined)
  const onOpenAll = props.onOpenAll ?? vi.fn().mockResolvedValue(undefined)
  const view = render(
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
  return { onCloseAll, onOpenAll, view }
}

const trigger = (name: 'Close variations' | 'Open variations') => screen.getAllByRole('button', { name })[0]
const confirm = (name: 'Close variations' | 'Open variations') => screen.getAllByRole('button', { name }).at(-1)!

describe('BulkRegistrationButton', () => {
  it('renders nothing for someone who does not own the experiment', () => {
    renderButton({ isOwner: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders nothing once every variation has ended', () => {
    renderButton({ openVariationAppIds: [], closedVariationAppIds: [] })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers Close variations while anything is still open', () => {
    renderButton()
    expect(trigger('Close variations')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open variations' })).not.toBeInTheDocument()
  })

  it('offers Open variations once nothing is open', () => {
    renderButton({ openVariationAppIds: [] })
    expect(trigger('Open variations')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close variations' })).not.toBeInTheDocument()
  })

  it('does not change anything until the dialog is confirmed', async () => {
    const user = userEvent.setup()
    const { onCloseAll } = renderButton()

    await user.click(trigger('Close variations'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(onCloseAll).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onCloseAll).not.toHaveBeenCalled()
  })

  it('closes only the open variations once confirmed', async () => {
    const user = userEvent.setup()
    const { onCloseAll, onOpenAll } = renderButton()

    await user.click(trigger('Close variations'))
    await screen.findByRole('dialog')
    await user.click(confirm('Close variations'))

    expect(onCloseAll).toHaveBeenCalledWith(OPEN)
    expect(onOpenAll).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('opens only the closed variations once confirmed', async () => {
    const user = userEvent.setup()
    const { onCloseAll, onOpenAll } = renderButton({ openVariationAppIds: [] })

    await user.click(trigger('Open variations'))
    await screen.findByRole('dialog')
    await user.click(confirm('Open variations'))

    expect(onOpenAll).toHaveBeenCalledWith(CLOSED)
    expect(onCloseAll).not.toHaveBeenCalled()
  })

  it('counts what it is about to change', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(trigger('Close variations'))
    expect(await screen.findByText(/All 2 open variations/i)).toBeInTheDocument()
  })

  it('warns that variations it could not read stay untouched', async () => {
    const user = userEvent.setup()
    renderButton({ unreadableVariationCount: 1 })

    await user.click(trigger('Close variations'))
    expect(await screen.findByText(/state could not be read/i)).toBeInTheDocument()
  })

  it('keeps the dialog open and reports where a partial run stopped', async () => {
    const user = userEvent.setup()
    renderButton({ onCloseAll: vi.fn().mockRejectedValue(new Error('Stopped at app 1002: could not close registration.')) })

    await user.click(trigger('Close variations'))
    await screen.findByRole('dialog')
    await user.click(confirm('Close variations'))

    expect(await screen.findByText(/Stopped at app 1002/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(confirm('Close variations')).toBeEnabled()
  })

  it('cannot act once the list empties while the dialog is open', async () => {
    const user = userEvent.setup()
    const onCloseAll = vi.fn().mockResolvedValue(undefined)
    const onOpenAll = vi.fn().mockResolvedValue(undefined)
    const { view } = renderButton({ onCloseAll, onOpenAll })

    await user.click(trigger('Close variations'))
    await screen.findByRole('dialog')

    // A background refetch discovers every variation has ended.
    view.rerender(
      <TooltipProvider>
        <BulkRegistrationButton
          openVariationAppIds={[]}
          closedVariationAppIds={[]}
          unreadableVariationCount={0}
          isOwner
          onCloseAll={onCloseAll}
          onOpenAll={onOpenAll}
        />
      </TooltipProvider>,
    )

    expect(await screen.findByText(/nothing to change/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open variations' })).not.toBeInTheDocument()
    expect(onCloseAll).not.toHaveBeenCalled()
    expect(onOpenAll).not.toHaveBeenCalled()
  })
})

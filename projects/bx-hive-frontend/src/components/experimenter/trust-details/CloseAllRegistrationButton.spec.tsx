import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import CloseAllRegistrationButton from './CloseAllRegistrationButton'
import { TooltipProvider } from '@/components/ds/tooltip'

function renderButton(props: Partial<React.ComponentProps<typeof CloseAllRegistrationButton>> = {}) {
  const onCloseAll = props.onCloseAll ?? vi.fn().mockResolvedValue(undefined)
  const view = render(
    <TooltipProvider>
      <CloseAllRegistrationButton openVariationCount={2} unreadableVariationCount={0} isOwner onCloseAll={onCloseAll} {...props} />
    </TooltipProvider>,
  )
  return { onCloseAll, view }
}

const triggerButton = () => screen.getByRole('button', { name: /Close registration/i })
const confirmButton = () => screen.getAllByRole('button', { name: /Close registration/i }).at(-1)!

describe('CloseAllRegistrationButton', () => {
  it('renders nothing for someone who does not own the experiment', () => {
    renderButton({ isOwner: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders nothing when no variation is still open', () => {
    renderButton({ openVariationCount: 0 })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not close anything until the dialog is confirmed', async () => {
    const user = userEvent.setup()
    const { onCloseAll } = renderButton()

    await user.click(triggerButton())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(onCloseAll).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onCloseAll).not.toHaveBeenCalled()
  })

  it('closes every open variation once confirmed', async () => {
    const user = userEvent.setup()
    const { onCloseAll } = renderButton()

    await user.click(triggerButton())
    await screen.findByRole('dialog')
    await user.click(confirmButton())

    expect(onCloseAll).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('counts the variations it is about to close', async () => {
    const user = userEvent.setup()
    renderButton({ openVariationCount: 3 })

    await user.click(triggerButton())
    expect(await screen.findByText(/All 3 open variations/i)).toBeInTheDocument()
  })

  it('keeps the dialog open and reports where the run stopped', async () => {
    const user = userEvent.setup()
    renderButton({ onCloseAll: vi.fn().mockRejectedValue(new Error('Stopped at app 1077: could not close registration. 1 of 3 done.')) })

    await user.click(triggerButton())
    await screen.findByRole('dialog')
    await user.click(confirmButton())

    expect(await screen.findByText(/Stopped at app 1077/i)).toBeInTheDocument()
    expect(await screen.findByText(/1 of 3 done/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(confirmButton()).toBeEnabled()
  })

  it('warns that variations it could not read stay untouched', async () => {
    const user = userEvent.setup()
    renderButton({ openVariationCount: 2, unreadableVariationCount: 1 })

    await user.click(triggerButton())
    expect(await screen.findByText(/state could not be read/i)).toBeInTheDocument()
  })

  it('cannot close anything once the open count drops to zero while the dialog is open', async () => {
    const user = userEvent.setup()
    const onCloseAll = vi.fn().mockResolvedValue(undefined)
    const { view } = renderButton({ onCloseAll })

    await user.click(triggerButton())
    await screen.findByRole('dialog')

    // A background refetch discovers every variation is already closed.
    view.rerender(
      <TooltipProvider>
        <CloseAllRegistrationButton openVariationCount={0} unreadableVariationCount={0} isOwner onCloseAll={onCloseAll} />
      </TooltipProvider>,
    )

    expect(await screen.findByText(/nothing left to close/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Close registration$/i })).not.toBeInTheDocument()
    expect(onCloseAll).not.toHaveBeenCalled()
  })
})

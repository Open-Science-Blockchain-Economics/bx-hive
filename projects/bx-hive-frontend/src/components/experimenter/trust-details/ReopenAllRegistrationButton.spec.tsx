import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ReopenAllRegistrationButton from './ReopenAllRegistrationButton'
import { TooltipProvider } from '@/components/ds/tooltip'

function renderButton(props: Partial<React.ComponentProps<typeof ReopenAllRegistrationButton>> = {}) {
  const onReopenAll = props.onReopenAll ?? vi.fn().mockResolvedValue(undefined)
  render(
    <TooltipProvider>
      <ReopenAllRegistrationButton closedVariationCount={2} isOwner onReopenAll={onReopenAll} {...props} />
    </TooltipProvider>,
  )
  return { onReopenAll }
}

const button = () => screen.getByRole('button', { name: /Reopen registration/i })

describe('ReopenAllRegistrationButton', () => {
  it('renders nothing for someone who does not own the experiment', () => {
    renderButton({ isOwner: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders nothing when no variation is closed', () => {
    renderButton({ closedVariationCount: 0 })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('reopens every closed variation on a single click, with no confirmation', async () => {
    const user = userEvent.setup()
    const { onReopenAll } = renderButton()

    await user.click(button())

    expect(onReopenAll).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reports where a partial run stopped and stays clickable', async () => {
    const user = userEvent.setup()
    renderButton({ onReopenAll: vi.fn().mockRejectedValue(new Error('Stopped at app 1077: could not reopen registration.')) })

    await user.click(button())

    expect(await screen.findByText(/Stopped at app 1077/i)).toBeInTheDocument()
    expect(button()).toBeEnabled()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VariationLifecycleControls from './VariationLifecycleControls'
import { TooltipProvider } from '@/components/ds/tooltip'
import { STATUS_ACTIVE, STATUS_CLOSED, STATUS_COMPLETED } from '../../../hooks/useTrustVariation'
import type { VariationConfig } from '../../../hooks/useTrustVariation'

// useAssetMetadata depends on NetworkProvider + QueryClient; stub the synthetic
// ALGO response so this component test can stay focused on the controls.
vi.mock('../../../hooks/useAssetMetadata', () => ({
  useAssetMetadata: () => ({ assetId: 0n, decimals: 6, unitName: 'ALGO', name: 'Algorand', total: 0n }),
}))

const onCloseRegistration = vi.fn()
const onReopenRegistration = vi.fn()
const onEndVariation = vi.fn()
const onGetEscrowBalance = vi.fn()

function makeConfig(status: number): VariationConfig {
  return {
    e1: 1_000_000n,
    e2: 500_000n,
    multiplier: 3n,
    unit: 100_000n,
    assetId: 0n,
    status,
    maxParticipants: 0n,
  }
}

function renderControls(status: number, isOwner = true): ReturnType<typeof render> {
  const ui: ReactElement = (
    <VariationLifecycleControls
      appId={42n}
      config={makeConfig(status)}
      isOwner={isOwner}
      onCloseRegistration={onCloseRegistration}
      onReopenRegistration={onReopenRegistration}
      onEndVariation={onEndVariation}
      onGetEscrowBalance={onGetEscrowBalance}
    />
  )
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

// Radix marks the page behind an open dialog as inert, which trips the
// user-event pointer check in happy-dom.
const user = userEvent.setup({ pointerEventsCheck: 0 })

describe('VariationLifecycleControls', () => {
  beforeEach(() => {
    onCloseRegistration.mockReset().mockResolvedValue(undefined)
    onReopenRegistration.mockReset().mockResolvedValue(undefined)
    onEndVariation.mockReset().mockResolvedValue(undefined)
    onGetEscrowBalance.mockReset().mockResolvedValue(2_500_000n)
  })

  it('offers both controls and no status chip while active', () => {
    renderControls(STATUS_ACTIVE)

    expect(screen.getByRole('button', { name: 'Close registration' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End & refund' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reopen registration' })).not.toBeInTheDocument()
    expect(screen.queryByText('Closed')).not.toBeInTheDocument()
    expect(screen.queryByText('Ended')).not.toBeInTheDocument()
  })

  it('drops the close control and shows a Closed chip once registration is closed', () => {
    renderControls(STATUS_CLOSED)

    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close registration' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reopen registration' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End & refund' })).toBeInTheDocument()
  })

  it('shows only an Ended chip once the variation is completed', () => {
    renderControls(STATUS_COMPLETED)

    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close registration' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reopen registration' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'End & refund' })).not.toBeInTheDocument()
  })

  it('shows a non-owner the status chip but no controls', () => {
    renderControls(STATUS_CLOSED, false)

    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close registration' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reopen registration' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'End & refund' })).not.toBeInTheDocument()
  })

  it('closes registration through the callback', async () => {
    renderControls(STATUS_ACTIVE)

    await user.click(screen.getByRole('button', { name: 'Close registration' }))

    expect(onCloseRegistration).toHaveBeenCalledWith(42n)
  })

  it('reopens registration through the callback, without a confirmation step', async () => {
    renderControls(STATUS_CLOSED)

    await user.click(screen.getByRole('button', { name: 'Reopen registration' }))

    expect(onReopenRegistration).toHaveBeenCalledWith(42n)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('surfaces a failed reopen and leaves the control usable', async () => {
    onReopenRegistration.mockRejectedValueOnce(new Error('not the owner'))
    renderControls(STATUS_CLOSED)

    await user.click(screen.getByRole('button', { name: 'Reopen registration' }))

    expect(await screen.findByText('not the owner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reopen registration' })).toBeEnabled()
  })

  it('states the refund amount and ends the variation when confirmed', async () => {
    renderControls(STATUS_ACTIVE)

    await user.click(screen.getByRole('button', { name: 'End & refund' }))

    expect(onGetEscrowBalance).toHaveBeenCalledWith(42n)
    expect(await screen.findByText('2.500 ALGO of unspent escrow returns to your wallet.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'End variation' }))

    expect(onEndVariation).toHaveBeenCalledWith(42n)
  })

  it('still allows confirming when the escrow balance cannot be read', async () => {
    onGetEscrowBalance.mockRejectedValueOnce(new Error('algod unreachable'))
    renderControls(STATUS_ACTIVE)

    await user.click(screen.getByRole('button', { name: 'End & refund' }))

    expect(await screen.findByText(/remaining escrow could not be read/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'End variation' }))

    expect(onEndVariation).toHaveBeenCalledWith(42n)
  })

  it('does not end the variation when the dialog is dismissed', async () => {
    renderControls(STATUS_ACTIVE)

    await user.click(screen.getByRole('button', { name: 'End & refund' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(onEndVariation).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('surfaces a failed end and re-enables the confirm button', async () => {
    onEndVariation.mockRejectedValueOnce(new Error('chain rejected'))
    renderControls(STATUS_ACTIVE)

    await user.click(screen.getByRole('button', { name: 'End & refund' }))
    await user.click(await screen.findByRole('button', { name: 'End variation' }))

    expect(await screen.findByText('chain rejected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End variation' })).toBeEnabled()
  })
})

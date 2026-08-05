import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ViewInstructionsButton from './ViewInstructionsButton'
import { STATUS_ACTIVE } from '@/hooks/useTrustVariation'
import type { VariationConfig } from '@/hooks/useTrustVariation'

vi.mock('@/hooks/useAssetMetadata', () => ({
  useAssetMetadata: () => ({ assetId: 0n, decimals: 6, unitName: 'ALGO', name: 'Algorand', total: 0n }),
}))

vi.mock('virtual:instructions/trust-variation/shared', () => ({
  default: '{{investorLabel}} starts with {{e1}} and sends to {{trusteeLabel}}.',
}))

const config: VariationConfig = {
  e1: 5_000_000n,
  e2: 0n,
  multiplier: 3n,
  unit: 100_000n,
  assetId: 0n,
  status: STATUS_ACTIVE,
  maxParticipants: 0n,
}

const roleLabels = { investorLabel: 'Decision Maker 1', trusteeLabel: 'Decision Maker 2' }

function renderButton() {
  return render(<ViewInstructionsButton config={config} roleLabels={roleLabels} myLabel="Decision Maker 1" />)
}

describe('ViewInstructionsButton', () => {
  it('keeps the instructions closed until asked for', () => {
    renderButton()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the instructions with the amounts and labels substituted', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: /View instructions/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Decision Maker 1 starts with 5 ALGO and sends to Decision Maker 2.')).toBeInTheDocument()
  })

  it('names which role the reader holds', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: /View instructions/i }))

    expect(await screen.findByRole('heading', { name: /your role: Decision Maker 1/i })).toBeInTheDocument()
  })

  it('can be dismissed, unlike the forced modal shown on entering the game', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: /View instructions/i }))
    await screen.findByRole('dialog')
    // The dialog also renders an X with an sr-only "Close" label; the footer button is last.
    await user.click(screen.getAllByRole('button', { name: /^Close$/i }).at(-1)!)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

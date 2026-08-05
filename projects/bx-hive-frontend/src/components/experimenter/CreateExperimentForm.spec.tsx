import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import CreateExperimentForm from './CreateExperimentForm'
import { TooltipProvider } from '@/components/ds/tooltip'

// useAlgorand needs a wallet provider; the form only reads it for the asset-balance
// query, which stays disabled with no connected address.
vi.mock('../../hooks/useAlgorand', () => ({
  useAlgorand: () => ({ algorand: null, activeAddress: null }),
}))

function renderForm() {
  const createExperimentWithVariation = vi.fn().mockResolvedValue({ expId: 1 })
  const createVariation = vi.fn().mockResolvedValue(1001n)
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TooltipProvider>
          <CreateExperimentForm
            walletBalanceAlgo={100_000}
            createExperimentWithVariation={createExperimentWithVariation}
            createVariation={createVariation}
            onCreated={vi.fn()}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
  return { createExperimentWithVariation, createVariation }
}

const user = userEvent.setup()

async function fillRequiredFields() {
  await user.type(screen.getByLabelText(/Experiment Name/i), 'Pilot')
  await user.type(screen.getByLabelText(/Matches per variation/i), '1')
}

describe('CreateExperimentForm role labels', () => {
  it('sends the Investor/Trustee defaults when both label fields are left blank', async () => {
    const { createExperimentWithVariation } = renderForm()

    await fillRequiredFields()
    await user.click(screen.getByRole('button', { name: /Deploy experiment/i }))

    await waitFor(() => expect(createExperimentWithVariation).toHaveBeenCalledTimes(1))
    expect(createExperimentWithVariation.mock.calls[0][1]).toEqual({ investorLabel: 'Investor', trusteeLabel: 'Trustee' })
  })

  it('sends whitespace-only labels as the defaults rather than blank strings', async () => {
    const { createExperimentWithVariation } = renderForm()

    await fillRequiredFields()
    await user.type(screen.getByLabelText(/Investor label/i), '   ')
    await user.type(screen.getByLabelText(/Trustee label/i), '   ')
    await user.click(screen.getByRole('button', { name: /Deploy experiment/i }))

    await waitFor(() => expect(createExperimentWithVariation).toHaveBeenCalledTimes(1))
    expect(createExperimentWithVariation.mock.calls[0][1]).toEqual({ investorLabel: 'Investor', trusteeLabel: 'Trustee' })
  })

  it('sends the typed labels, trimmed, in the order the ABI expects', async () => {
    const { createExperimentWithVariation } = renderForm()

    await fillRequiredFields()
    await user.type(screen.getByLabelText(/Investor label/i), ' Decision Maker 1 ')
    await user.type(screen.getByLabelText(/Trustee label/i), ' Decision Maker 2 ')
    await user.click(screen.getByRole('button', { name: /Deploy experiment/i }))

    await waitFor(() => expect(createExperimentWithVariation).toHaveBeenCalledTimes(1))
    const [name, labels] = createExperimentWithVariation.mock.calls[0]
    expect(name).toBe('Pilot')
    expect(labels).toEqual({ investorLabel: 'Decision Maker 1', trusteeLabel: 'Decision Maker 2' })
  })
})

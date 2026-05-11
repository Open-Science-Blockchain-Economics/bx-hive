import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import JoinableExperimentCard from './JoinableExperimentCard'
import type { ExperimentGroup, VariationInfo } from '@/hooks/useTrustExperiments'

const group: ExperimentGroup = {
  expId: 0,
  owner: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  name: 'Pilot',
  createdAt: 0n,
  variationCount: 1n,
}

const variations: VariationInfo[] = [{ varId: 0, appId: 1001n, label: 'Baseline', createdAt: 0n }]

const baseProps = {
  group,
  variations,
  joining: null,
  joinError: null,
  onJoin: vi.fn(),
}

describe('JoinableExperimentCard', () => {
  it('renders an "Open" chip and an enabled Join button when not full', () => {
    render(<JoinableExperimentCard {...baseProps} isFull={false} />)

    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.queryByText('Full')).not.toBeInTheDocument()
    expect(screen.queryByText(/All variations are full/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Join experiment/i })).toBeEnabled()
  })

  it('renders a "Full" chip, an explanatory line, and a disabled Join button when full', () => {
    render(<JoinableExperimentCard {...baseProps} isFull />)

    expect(screen.getByText('Full')).toBeInTheDocument()
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
    expect(screen.getByText(/All variations are full/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Join experiment/i })).toBeDisabled()
  })

  it('does not call onJoin when the button is clicked while full', async () => {
    const onJoin = vi.fn()
    const user = userEvent.setup()
    render(<JoinableExperimentCard {...baseProps} onJoin={onJoin} isFull />)

    await user.click(screen.getByRole('button', { name: /Join experiment/i }))
    expect(onJoin).not.toHaveBeenCalled()
  })

  it('calls onJoin with expId and variations when the button is clicked while open', async () => {
    const onJoin = vi.fn()
    const user = userEvent.setup()
    render(<JoinableExperimentCard {...baseProps} onJoin={onJoin} isFull={false} />)

    await user.click(screen.getByRole('button', { name: /Join experiment/i }))
    expect(onJoin).toHaveBeenCalledWith(0, variations)
  })

  it('disables the button while a join is in flight regardless of full state', () => {
    render(<JoinableExperimentCard {...baseProps} joining={0} isFull={false} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('surfaces joinError text only when not currently joining', () => {
    const { rerender } = render(<JoinableExperimentCard {...baseProps} joinError="Already enrolled" joining={null} isFull={false} />)
    expect(screen.getByText('Already enrolled')).toBeInTheDocument()

    rerender(<JoinableExperimentCard {...baseProps} joinError="Already enrolled" joining={0} isFull={false} />)
    expect(screen.queryByText('Already enrolled')).not.toBeInTheDocument()
  })
})

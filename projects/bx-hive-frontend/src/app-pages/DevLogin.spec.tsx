import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useWalletMock = vi.fn()
const useActiveUserMock = vi.fn()
const connectKmdAccountMock = vi.fn()

vi.mock('@txnlab/use-wallet-react', () => ({ useWallet: () => useWalletMock() }))
vi.mock('../hooks/useActiveUser', () => ({ useActiveUser: () => useActiveUserMock() }))
vi.mock('../utils/kmdConnect', () => ({ connectKmdAccount: (...args: unknown[]) => connectKmdAccountMock(...args) }))

import DevLogin from './DevLogin'

const TARGET = 'TARGET77777777777777777777777777777777777777777777777777'
const OTHER = 'OTHER555555555555555555555555555555555555555555555555555'

function mockWallet({ activeAddress = null, isReady = true }: { activeAddress?: string | null; isReady?: boolean } = {}) {
  useWalletMock.mockReturnValue({ wallets: [], isReady, activeAddress })
}

function mockActiveUser({ role, isFetched = true }: { role?: 'participant' | 'experimenter'; isFetched?: boolean } = {}) {
  useActiveUserMock.mockReturnValue({ activeUser: role ? { id: TARGET, name: 'Test', role } : null, isFetched })
}

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/dev/login${search}`]}>
      <Routes>
        <Route path="/dev/login" element={<DevLogin />} />
        <Route path="/dashboard/participant" element={<div>PARTICIPANT DASHBOARD</div>} />
        <Route path="/dashboard/experimenter" element={<div>EXPERIMENTER DASHBOARD</div>} />
        <Route path="/join" element={<div>JOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  connectKmdAccountMock.mockResolvedValue(undefined)
})

describe('DevLogin', () => {
  it('connects the account named in ?account=', () => {
    mockWallet()
    mockActiveUser()
    renderAt(`?account=${TARGET}`)
    expect(connectKmdAccountMock).toHaveBeenCalledWith([], TARGET)
  })

  it('lands a participant on the participant dashboard', () => {
    mockWallet({ activeAddress: TARGET })
    mockActiveUser({ role: 'participant' })
    renderAt(`?account=${TARGET}`)
    expect(screen.getByText('PARTICIPANT DASHBOARD')).toBeInTheDocument()
  })

  it('lands an experimenter on the experimenter dashboard', () => {
    // The seeded wallet holds experimenters too; hardcoding /dashboard/participant would bounce
    // them to /join via ProtectedRoute's role check.
    mockWallet({ activeAddress: TARGET })
    mockActiveUser({ role: 'experimenter' })
    renderAt(`?account=${TARGET}`)
    expect(screen.getByText('EXPERIMENTER DASHBOARD')).toBeInTheDocument()
  })

  it('waits instead of navigating while the wallet has not connected yet', () => {
    // Navigating here would let ProtectedRoute redirect to /join and unmount this route.
    mockWallet({ activeAddress: null })
    mockActiveUser()
    renderAt(`?account=${TARGET}`)
    expect(screen.getByText(/Signing in as/)).toBeInTheDocument()
    expect(screen.queryByText('JOIN')).not.toBeInTheDocument()
  })

  it('waits while a different account is still active', () => {
    // Guards the "paste a second link in the same tab" case from redirecting on stale user data.
    mockWallet({ activeAddress: OTHER })
    mockActiveUser({ role: 'participant' })
    renderAt(`?account=${TARGET}`)
    expect(screen.getByText(/Signing in as/)).toBeInTheDocument()
  })

  it('waits while the registry lookup is in flight', () => {
    mockWallet({ activeAddress: TARGET })
    mockActiveUser({ isFetched: false })
    renderAt(`?account=${TARGET}`)
    expect(screen.getByText(/Signing in as/)).toBeInTheDocument()
  })

  it('explains an account that connected but has no registry user', () => {
    mockWallet({ activeAddress: TARGET })
    mockActiveUser({ isFetched: true })
    renderAt(`?account=${TARGET}`)
    expect(screen.getByRole('alert')).toHaveTextContent(/isn’t registered/)
  })

  it('surfaces a connect failure instead of hanging on the spinner', async () => {
    mockWallet()
    mockActiveUser()
    connectKmdAccountMock.mockRejectedValue(new Error('Account is not in the "x" KMD wallet on this instance.'))
    renderAt(`?account=${TARGET}`)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not in the/)
  })

  it('explains a missing ?account= and never connects', () => {
    mockWallet()
    mockActiveUser()
    renderAt('')
    expect(screen.getByRole('alert')).toHaveTextContent(/Missing \?account=/)
    expect(connectKmdAccountMock).not.toHaveBeenCalled()
  })

  it('does not reconnect once the target is already active', () => {
    mockWallet({ activeAddress: TARGET })
    mockActiveUser({ role: 'participant' })
    renderAt(`?account=${TARGET}`)
    expect(connectKmdAccountMock).not.toHaveBeenCalled()
  })
})

import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { Dot } from '@/components/ds/dot'
import { Input } from '@/components/ds/input'
import { cn } from '@/lib/utils'
import { type LocalnetAccount, type LocalnetAccountRole, useLocalnetAccounts } from '../hooks/useLocalnetAccounts'
import { truncateAddress } from '../utils/address'
import { CopyButton } from './ui'

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div role="status" className="fixed bottom-4 right-4 z-50 rounded-sm border border-pos/35 bg-pos-bg text-pos px-3 py-2.5 text-sm">
      {message}
    </div>
  )
}

const selectClass =
  'h-9 rounded-sm border border-input bg-card px-2.5 text-[13px] text-foreground font-ui transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

function FundDropdown({ onFund, isPending }: { onFund: (address: string, amount: number) => Promise<void>; isPending: boolean }) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('10')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleFund() {
    setError(null)
    const trimmed = address.trim()
    if (!trimmed) {
      setError('Address is required')
      return
    }
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount')
      return
    }
    try {
      await onFund(trimmed, numAmount)
      setSuccessMsg(`Funded ${truncateAddress(trimmed)} with ${numAmount} ALGO`)
      setAddress('')
      setAmount('10')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Funding failed')
    }
  }

  return (
    <>
      {successMsg && <Toast message={successMsg} onDismiss={() => setSuccessMsg(null)} />}
      <div ref={wrapperRef} className="relative">
        <Btn variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          Fund account
        </Btn>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-10 w-80 rounded-sm border border-border bg-popover p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                mono
                placeholder="Paste wallet address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isPending}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  mono
                  className="w-24"
                  placeholder="ALGO"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  disabled={isPending}
                />
                <span className="text-xs text-muted-foreground">ALGO</span>
                <Btn variant="primary" size="sm" className="ml-auto" onClick={() => void handleFund()} disabled={isPending}>
                  Fund
                </Btn>
              </div>
              {error && <p className="text-neg text-xs">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function AccountRow({
  account,
  isSelected,
  activeAddress,
  onSelect,
  onRegister,
  onConnect,
}: {
  account: LocalnetAccount
  isSelected: boolean
  activeAddress: string | null
  onSelect: () => void
  onRegister: (address: string, name: string, role: LocalnetAccountRole) => Promise<void>
  onConnect: (address: string) => Promise<void>
}) {
  const [name, setName] = useState(account.name)
  const [role, setRole] = useState<LocalnetAccountRole>('subject')
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    setRegistering(true)
    setError(null)
    try {
      await onRegister(account.address, name.trim() || account.name, role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <>
      <tr
        className={cn(
          'border-b border-border last:border-b-0 transition-colors',
          !account.registered && 'cursor-pointer hover:bg-muted',
          isSelected && !account.registered && 'bg-muted',
        )}
        onClick={!account.registered ? onSelect : undefined}
        title={!account.registered ? 'Click to register' : undefined}
      >
        <td className="text-muted-foreground text-xs px-3 py-2 hidden sm:table-cell w-12">{account.name.replace('Account ', '')}</td>
        <td className="px-3 py-2">
          <span className="inline-flex items-center">
            <code className="font-mono text-xs text-ink-2" title={account.address}>
              {truncateAddress(account.address)}
            </code>
            <CopyButton text={account.address} />
          </span>
        </td>
        <td className="px-3 py-2">
          {account.registered ? (
            <Chip tone={account.role === 'experimenter' ? 'accent' : 'neutral'}>{account.role}</Chip>
          ) : (
            <span className="text-faint text-xs">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          {account.registered ? (
            activeAddress === account.address ? (
              <span className="inline-flex items-center gap-1.5 text-pos text-xs font-medium">
                <Dot tone="pos" size={6} /> Active
              </span>
            ) : (
              <Btn
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  void onConnect(account.address)
                }}
              >
                Connect
              </Btn>
            )
          ) : (
            <span className="text-faint text-xs">{isSelected ? '▲ close' : 'click to register'}</span>
          )}
        </td>
      </tr>

      {/* Expandable registration form — shown when row is selected and unregistered */}
      {isSelected && !account.registered && (
        <tr className="bg-muted">
          <td colSpan={4} className="py-3 px-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                type="text"
                className="w-full sm:w-40"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                disabled={registering}
                autoFocus
              />
              <select
                className={selectClass}
                value={role}
                onChange={(e) => setRole(e.target.value as LocalnetAccountRole)}
                disabled={registering}
              >
                <option value="subject">Subject</option>
                <option value="experimenter">Experimenter</option>
              </select>
              <Btn variant="primary" size="sm" onClick={() => void handleRegister()} disabled={registering}>
                Register
              </Btn>
            </div>
            {error && <p className="text-neg text-xs mt-2">{error}</p>}
          </td>
        </tr>
      )}
    </>
  )
}

export default function LocalnetAccountsTable() {
  const { accounts, seeded, registerAccount, fundAccount, fundingInProgress, refresh } = useLocalnetAccounts()
  const { wallets, activeAddress } = useWallet()
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)

  const handleConnect = async (address: string) => {
    const kmdWallet = wallets?.find((w) => w.id === 'kmd')
    if (!kmdWallet) return
    if (kmdWallet.isConnected) {
      await kmdWallet.disconnect()
    }
    await kmdWallet.connect()
    kmdWallet.setActiveAccount(address)
  }

  if (import.meta.env.VITE_ENVIRONMENT !== 'local') return null

  const registeredCount = accounts.filter((a) => a.registered).length

  return (
    <Panel>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="t-h1">Test Accounts</h2>
          {seeded && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {registeredCount}/{accounts.length} registered — click an unregistered row to set up
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FundDropdown onFund={fundAccount} isPending={fundingInProgress} />
          <Btn variant="ghost" size="sm" onClick={() => void refresh()}>
            Refresh
          </Btn>
        </div>
      </div>

      {!seeded && (
        <div role="alert" className="rounded-sm border border-warn/35 bg-warn-bg text-warn px-3 py-2.5 text-sm">
          No seeded accounts found. Run <code className="font-mono px-1 rounded bg-bg-alt">pnpm seed:localnet</code> then refresh.
        </div>
      )}

      {seeded && (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left t-micro px-3 py-2 hidden sm:table-cell w-12">#</th>
                <th className="text-left t-micro px-3 py-2">Address</th>
                <th className="text-left t-micro px-3 py-2">Role</th>
                <th className="text-right t-micro px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <AccountRow
                  key={account.address}
                  account={account}
                  isSelected={selectedAddress === account.address}
                  activeAddress={activeAddress ?? null}
                  onSelect={() => setSelectedAddress(selectedAddress === account.address ? null : account.address)}
                  onRegister={async (address, name, role) => {
                    await registerAccount(address, name, role)
                    setSelectedAddress(null)
                  }}
                  onConnect={handleConnect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

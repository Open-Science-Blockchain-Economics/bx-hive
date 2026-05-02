import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useNetwork, useWallet, type Wallet } from '@txnlab/use-wallet-react'
import { Check, Copy, ExternalLink, FlaskConical, LogOut, Menu, Moon, Sun, User, X } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Dot } from '@/components/ds/dot'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ds/dropdown-menu'
import { Wordmark } from '@/components/ds/wordmark'
import ThemeToggle from '@/components/ThemeToggle'
import { useActiveUser } from '@/hooks/useActiveUser'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/ThemeProvider'
import type { User as ActiveUser } from '@/types'
import { truncateAddress } from '@/utils/address'
import { loraAccountUrl } from '@/utils/lora'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'pb-0.5 border-b text-[13px] tracking-[-0.005em] transition-colors',
    isActive
      ? 'font-semibold text-foreground border-primary'
      : 'font-normal text-muted-foreground border-transparent hover:text-foreground',
  )

const mobileRowClass = 'flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted w-full text-left'

interface MobileNavPanelProps {
  open: boolean
  onClose: () => void
  activeUser: ActiveUser | null
  dashboardPath: string
  address: string | null
  network: string
  wallets: Wallet[] | undefined
  onDisconnect: () => void
}

function MobileNavPanel({ open, onClose, activeUser, dashboardPath, address, network, wallets, onDisconnect }: MobileNavPanelProps) {
  const { theme, toggleTheme } = useTheme()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (!address) return
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [address])

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'md:hidden fixed inset-0 z-30 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />
      <div
        className={cn(
          'md:hidden fixed left-0 right-0 top-[57px] z-40 bg-background border-b border-border h-[calc(100vh-57px)] overflow-y-auto',
          'transition-transform duration-200 ease-out',
          open ? 'translate-y-0' : '-translate-y-[100vh] pointer-events-none',
        )}
      >
        <nav className="flex flex-col py-2">
          <Link to="/" onClick={onClose} className={mobileRowClass}>
            Home
          </Link>
          {activeUser && (
            <Link to={dashboardPath} onClick={onClose} className={mobileRowClass}>
              Dashboard
            </Link>
          )}
          <a
            href="https://open-science-blockchain-economics.github.io/bx-hive/getting-started/overview/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className={cn(mobileRowClass, 'justify-between')}
          >
            <span>Docs</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
        </nav>

        {activeUser && (
          <>
            <div className="border-t border-border" />
            <div className="px-4 py-3">
              <span className="t-micro">
                ROLE · <span className="text-ink-2">{activeUser.role}</span>
              </span>
            </div>
          </>
        )}

        <div className="border-t border-border" />
        <button type="button" onClick={toggleTheme} className={mobileRowClass}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          Switch to {theme === 'dark' ? 'light' : 'dark'} theme
        </button>

        <div className="border-t border-border" />
        {address ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3">
              <Dot tone="pos" size={6} />
              {activeUser?.role === 'experimenter' && <FlaskConical className="size-3.5" />}
              {activeUser?.role === 'subject' && <User className="size-3.5" />}
              <span className="font-mono text-xs text-ink-2">{activeUser?.name ?? truncateAddress(address)}</span>
            </div>
            <button type="button" onClick={handleCopy} className={mobileRowClass}>
              {copied ? <Check className="size-4 text-pos" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy address'}
            </button>
            <a
              href={loraAccountUrl(network, address)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={mobileRowClass}
            >
              <ExternalLink className="size-4" />
              View on Lora
            </a>
            <button
              type="button"
              onClick={() => {
                onDisconnect()
                onClose()
              }}
              className={cn(mobileRowClass, 'text-neg')}
            >
              <LogOut className="size-4" />
              Disconnect
            </button>
          </div>
        ) : (
          <div className="py-2">
            <p className="t-micro px-4 mb-1">Connect wallet</p>
            {wallets?.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => {
                  void wallet.connect()
                  onClose()
                }}
                className={mobileRowClass}
              >
                {wallet.metadata.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ConnectWalletButton() {
  const { wallets } = useWallet()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Btn variant="secondary" size="sm">
          Connect wallet
        </Btn>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel>Available wallets</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {wallets?.map((wallet) => (
          <DropdownMenuItem key={wallet.id} onSelect={() => void wallet.connect()}>
            {wallet.metadata.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WalletPill({
  address,
  network,
  activeUser,
  onDisconnect,
}: {
  address: string
  network: string
  activeUser: ActiveUser | null
  onDisconnect: () => void
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [address])

  const RoleIcon = activeUser?.role === 'experimenter' ? FlaskConical : activeUser?.role === 'subject' ? User : null
  const display = activeUser?.name ?? truncateAddress(address)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Wallet menu: ${display}`}
          className="inline-flex items-center gap-2 px-2.5 py-[5px] rounded-sm border border-border bg-card font-mono text-xs text-ink-2 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Dot tone="pos" size={6} />
          {RoleIcon && <RoleIcon className="size-3.5" />}
          <span className="max-w-[140px] truncate">{display}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="font-mono text-[11px] text-muted-foreground">{truncateAddress(address)}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleCopy}>
          {copied ? <Check className="size-4 text-pos" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy address'}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={loraAccountUrl(network, address)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            View on Lora
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDisconnect}>
          <LogOut className="size-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeAddress, wallets } = useWallet()
  const { activeNetwork } = useNetwork()
  const { activeUser, clearActiveUser } = useActiveUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDisconnect = useCallback(async () => {
    const activeWallet = wallets?.find((w) => w.isActive)
    if (activeWallet) {
      await activeWallet.disconnect()
    }
    clearActiveUser()
    navigate('/')
  }, [wallets, clearActiveUser, navigate])

  // Auto-close the mobile panel on route change.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const dashboardPath = activeUser ? `/dashboard/${activeUser.role}` : '/dashboard/subject'

  return (
    <>
      <header className="relative z-50 border-b border-border bg-background font-ui">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 md:gap-6 px-4 md:px-7 py-3.5">
          <NavLink to="/" className="flex items-center">
            <Wordmark size={16} />
          </NavLink>

          <nav className="hidden md:flex ml-3 items-center gap-5">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            {activeUser && (
              <NavLink to={dashboardPath} className={navLinkClass}>
                Dashboard
              </NavLink>
            )}
            <a
              href="https://open-science-blockchain-economics.github.io/bx-hive/getting-started/overview/"
              target="_blank"
              rel="noopener noreferrer"
              className="pb-0.5 text-[13px] tracking-[-0.005em] font-normal text-muted-foreground border-b border-transparent hover:text-foreground transition-colors"
            >
              Docs
            </a>
          </nav>

          <div className="hidden md:flex ml-auto items-center gap-3">
            {activeUser && (
              <div className="flex items-center gap-3">
                <span className="t-micro">
                  ROLE · <span className="text-ink-2">{activeUser.role}</span>
                </span>
                <span className="w-px h-3.5 bg-rule-2" />
              </div>
            )}
            <ThemeToggle />
            {activeAddress ? (
              <WalletPill
                address={activeAddress}
                network={activeNetwork}
                activeUser={activeUser}
                onDisconnect={() => void handleDisconnect()}
              />
            ) : (
              <ConnectWalletButton />
            )}
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden ml-auto inline-flex items-center justify-center w-8 h-8 rounded-sm border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>
      <MobileNavPanel
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activeUser={activeUser}
        dashboardPath={dashboardPath}
        address={activeAddress ?? null}
        network={activeNetwork}
        wallets={wallets}
        onDisconnect={() => void handleDisconnect()}
      />
    </>
  )
}

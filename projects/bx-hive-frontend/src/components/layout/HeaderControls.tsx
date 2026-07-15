import '@/lib/buffer-shim'

import { useCallback, useState } from 'react'
import { useNetwork, useWallet } from '@txnlab/use-wallet-react'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'

import { Dot } from '@/components/ds/dot'
import ThemeToggle from '@/components/ThemeToggle'
import { ConnectWalletButton, WalletPill, mobileRowClass } from '@/components/layout/nav-parts'
import { NAV_LINKS, isNavActive } from '@/components/layout/nav-links'
import { cn } from '@/lib/utils'
import { NetworkProvider } from '@/providers/NetworkProvider'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import { truncateAddress } from '@/utils/address'

// The interactive half of the marketing header. The wordmark and desktop nav
// are static markup in SiteHeader.astro so the header paints without JS.

function MobileNavPanel({
  open,
  onClose,
  onDisconnect,
  currentPath,
}: {
  open: boolean
  onClose: () => void
  onDisconnect: () => void
  currentPath: string
}) {
  const { theme, toggleTheme } = useTheme()
  const { activeAddress, wallets } = useWallet()

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
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={onClose}
              className={cn(mobileRowClass, isNavActive(href, currentPath) && 'font-semibold text-primary')}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="border-t border-border" />
        <button type="button" onClick={toggleTheme} className={mobileRowClass}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          Switch to {theme === 'dark' ? 'light' : 'dark'} theme
        </button>

        <div className="border-t border-border" />
        {activeAddress ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3">
              <Dot tone="pos" size={6} />
              <span className="font-mono text-xs text-ink-2">{truncateAddress(activeAddress)}</span>
            </div>
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

function ControlsInner({ currentPath }: { currentPath: string }) {
  const { activeAddress, wallets } = useWallet()
  const { activeNetwork } = useNetwork()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDisconnect = useCallback(async () => {
    const activeWallet = wallets?.find((w) => w.isActive)
    if (activeWallet) await activeWallet.disconnect()
  }, [wallets])

  return (
    <>
      <div className="hidden md:flex items-center gap-3">
        <ThemeToggle />
        {activeAddress ? (
          <WalletPill address={activeAddress} network={activeNetwork} onDisconnect={() => void handleDisconnect()} />
        ) : (
          <ConnectWalletButton />
        )}
      </div>

      <button
        type="button"
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
        className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-sm border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      <MobileNavPanel
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onDisconnect={() => void handleDisconnect()}
        currentPath={currentPath}
      />
    </>
  )
}

export default function HeaderControls({ currentPath }: { currentPath: string }) {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <ControlsInner currentPath={currentPath} />
      </NetworkProvider>
    </ThemeProvider>
  )
}

import '@/lib/buffer-shim'

import { useCallback, useState } from 'react'
import { useNetwork, useWallet } from '@txnlab/use-wallet-react'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'

import { Dot } from '@/components/ds/dot'
import { Wordmark } from '@/components/ds/wordmark'
import ThemeToggle from '@/components/ThemeToggle'
import { ConnectWalletButton, WalletPill, mobileRowClass, navLinkClass } from '@/components/layout/nav-parts'
import { cn } from '@/lib/utils'
import { truncateAddress } from '@/utils/address'
import { NetworkProvider } from '@/providers/NetworkProvider'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'

// Router-free navbar for the static marketing/blog pages. No active-user or
// react-query context — just nav links, wallet connect, and theme. Cross-page
// nav is plain anchors; the dashboard lives at /app.

const NAV_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
] as const

// Static pages have no router, so derive the active link from the URL. A blog
// post (/blog/a-post) should still light up "Blog".
function useIsActive() {
  const path = typeof window === 'undefined' ? '' : window.location.pathname
  return (href: string) => path === href || path.startsWith(`${href}/`)
}

function MobileNavPanel({ open, onClose, onDisconnect }: { open: boolean; onClose: () => void; onDisconnect: () => void }) {
  const { theme, toggleTheme } = useTheme()
  const { activeAddress, wallets } = useWallet()
  const isActive = useIsActive()

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
            <a key={href} href={href} onClick={onClose} className={cn(mobileRowClass, isActive(href) && 'font-semibold text-primary')}>
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

function HeaderInner() {
  const { activeAddress, wallets } = useWallet()
  const { activeNetwork } = useNetwork()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isActive = useIsActive()

  const handleDisconnect = useCallback(async () => {
    const activeWallet = wallets?.find((w) => w.isActive)
    if (activeWallet) await activeWallet.disconnect()
  }, [wallets])

  return (
    <>
      <header className="relative z-50 border-b border-border bg-background font-ui">
        <div className="max-w-350 mx-auto flex items-center gap-3 md:gap-6 px-4 md:px-7 py-3.5">
          <a href="/" className="flex items-center">
            <Wordmark size={16} />
          </a>

          <nav className="hidden md:flex ml-3 items-center gap-5">
            {NAV_LINKS.map(({ label, href }) => (
              <a key={href} href={href} className={navLinkClass({ isActive: isActive(href) })}>
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex ml-auto items-center gap-3">
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
            className="md:hidden ml-auto inline-flex items-center justify-center w-8 h-8 rounded-sm border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>
      <MobileNavPanel open={mobileOpen} onClose={() => setMobileOpen(false)} onDisconnect={() => void handleDisconnect()} />
    </>
  )
}

export default function SiteHeader() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <HeaderInner />
      </NetworkProvider>
    </ThemeProvider>
  )
}

import '@/lib/buffer-shim'

import { useCallback } from 'react'
import { useNetwork, useWallet } from '@txnlab/use-wallet-react'

import { Wordmark } from '@/components/ds/wordmark'
import ThemeToggle from '@/components/ThemeToggle'
import { ConnectWalletButton, WalletPill } from '@/components/layout/nav-parts'
import { NetworkProvider } from '@/providers/NetworkProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

// Router-free navbar for the static marketing/blog pages. No active-user or
// react-query context — just wallet connect + theme. Cross-page nav is plain
// anchors; the dashboard lives at /app.

function HeaderInner() {
  const { activeAddress, wallets } = useWallet()
  const { activeNetwork } = useNetwork()

  const handleDisconnect = useCallback(async () => {
    const activeWallet = wallets?.find((w) => w.isActive)
    if (activeWallet) await activeWallet.disconnect()
  }, [wallets])

  return (
    <header className="relative z-50 border-b border-border bg-background font-ui">
      <div className="max-w-350 mx-auto flex items-center gap-3 md:gap-6 px-4 md:px-7 py-3.5">
        <a href="/" className="flex items-center">
          <Wordmark size={16} />
        </a>

        <div className="ml-auto flex items-center gap-3">
          <a
            href="/app"
            className="hidden sm:inline-flex pb-0.5 text-[13px] tracking-[-0.005em] font-normal text-muted-foreground border-b border-transparent hover:text-foreground transition-colors"
          >
            Open app
          </a>
          <ThemeToggle />
          {activeAddress ? (
            <WalletPill address={activeAddress} network={activeNetwork} onDisconnect={() => void handleDisconnect()} />
          ) : (
            <ConnectWalletButton />
          )}
        </div>
      </div>
    </header>
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

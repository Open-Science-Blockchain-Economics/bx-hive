import { useCallback, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { Check, Copy, ExternalLink, FlaskConical, LogOut, User } from 'lucide-react'

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
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import { truncateAddress } from '@/utils/address'
import { loraAccountUrl } from '@/utils/lora'

// Shared navbar pieces used by both the dashboard TopBar and the marketing
// SiteHeader so the navbar looks identical across the site.

export const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'pb-0.5 border-b text-[13px] tracking-[-0.005em] transition-colors',
    isActive
      ? 'font-semibold text-foreground border-primary'
      : 'font-normal text-muted-foreground border-transparent hover:text-foreground',
  )

export const mobileRowClass = 'flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted w-full text-left'

export function ConnectWalletButton() {
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

interface WalletPillProps {
  address: string
  network: string
  onDisconnect: () => void
  // Optional — the marketing header has no active-user context.
  role?: UserRole
  name?: string
}

export function WalletPill({ address, network, onDisconnect, role, name }: WalletPillProps) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [address])

  const RoleIcon = role === 'experimenter' ? FlaskConical : role === 'participant' ? User : null
  const display = name ?? truncateAddress(address)

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

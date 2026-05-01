import { useCallback, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useNetwork, useWallet } from '@txnlab/use-wallet-react'
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
import { Wordmark } from '@/components/ds/wordmark'
import ThemeToggle from '@/components/ThemeToggle'
import { useActiveUser } from '@/hooks/useActiveUser'
import { cn } from '@/lib/utils'
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
  const { activeAddress, wallets } = useWallet()
  const { activeNetwork } = useNetwork()
  const { activeUser, clearActiveUser } = useActiveUser()

  const handleDisconnect = useCallback(async () => {
    const activeWallet = wallets?.find((w) => w.isActive)
    if (activeWallet) {
      await activeWallet.disconnect()
    }
    clearActiveUser()
    navigate('/')
  }, [wallets, clearActiveUser, navigate])

  const dashboardPath = activeUser ? `/dashboard/${activeUser.role}` : '/dashboard/subject'

  return (
    <header className="flex items-center gap-6 px-7 py-3.5 border-b border-border bg-background font-ui">
      <NavLink to="/" className="flex items-center">
        <Wordmark size={16} />
      </NavLink>

      <nav className="ml-3 flex items-center gap-5">
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

      <div className="ml-auto flex items-center gap-3">
        {activeUser && (
          <>
            <span className="t-micro">
              ROLE · <span className="text-ink-2">{activeUser.role}</span>
            </span>
            <span className="w-px h-3.5 bg-rule-2" />
          </>
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
    </header>
  )
}

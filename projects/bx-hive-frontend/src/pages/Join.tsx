import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { ArrowLeft, ArrowRight, Check, FlaskConical, Loader2, User } from 'lucide-react'

import { Chip } from '@/components/ds/badge'
import { Crumbs, CrumbsItem, CrumbsLink, CrumbsList, CrumbsPage, CrumbsSeparator } from '@/components/ds/breadcrumb'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ds/dropdown-menu'
import { Field } from '@/components/ds/field'
import { Input } from '@/components/ds/input'
import { useActiveUser } from '@/hooks/useActiveUser'
import { useRegistry } from '@/hooks/useRegistry'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import { truncateAddress } from '@/utils/address'

const ROLE_COPY: Record<UserRole, { label: string; line: string; bullets: string[]; kind: string }> = {
  experimenter: {
    label: 'Experimenter',
    kind: 'ROLE · 01',
    line: 'You design and run economic experiments. Your manifests, payouts and dataset are all on-chain.',
    bullets: [
      'Create experiments from open-source templates (Trust Game today; BRET & Dictator soon).',
      'Fund a deposit pool — payouts settle automatically per match.',
      'Export signed CSV/JSON datasets for your analysis & replication package.',
      'Requires: Algorand wallet · institutional or independent affiliation.',
    ],
  },
  participant: {
    label: 'Participant',
    kind: 'ROLE · 02',
    line: 'You opt into running experiments and get paid for your time and decisions.',
    bullets: [
      'Browse open studies, opt in, and play through the web client.',
      'Receive payouts directly to your wallet within seconds of settlement.',
      'Build a verifiable participation record across studies.',
      'Requires: Algorand wallet · age 18+.',
    ],
  },
}

function isRole(value: string | null): value is UserRole {
  return value === 'experimenter' || value === 'participant'
}

function RoleCard({ role, selected, onSelect }: { role: UserRole; selected: boolean; onSelect: () => void }) {
  const Icon = role === 'experimenter' ? FlaskConical : User
  const copy = ROLE_COPY[role]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'text-left p-7 rounded-sm border flex flex-col gap-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        selected ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-muted',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'size-10 rounded-sm grid place-items-center',
            selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-ink-2',
          )}
        >
          <Icon className="size-5" strokeWidth={1.6} />
        </span>
        <span className="t-micro">{copy.kind}</span>
      </div>
      <div className="font-ui font-medium text-2xl tracking-[-0.012em] text-foreground">Join as {copy.label}</div>
      <p className="font-ui text-[13px] leading-[1.55] text-muted-foreground m-0">{copy.line}</p>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {copy.bullets.map((b) => (
          <li key={b} className="flex gap-2.5 items-start font-ui text-[13px] text-ink-2">
            <span className={cn('size-1 rounded-pill mt-2 shrink-0', selected ? 'bg-primary' : 'bg-rule-2')} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-2">
        {selected ? (
          <Chip tone="accent">Selected</Chip>
        ) : (
          <span className="font-ui text-[12px] text-muted-foreground">Click to select →</span>
        )}
      </div>
    </button>
  )
}

export default function Join() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { activeAddress, wallets } = useWallet()
  const { activeUser, setActiveUser } = useActiveUser()
  const { registerUser } = useRegistry()

  const initialRole: UserRole = useMemo(() => {
    const r = searchParams.get('role')
    return isRole(r) ? r : 'experimenter'
  }, [searchParams])

  const [role, setRole] = useState<UserRole>(initialRole)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (activeUser) {
      navigate(`/dashboard/${activeUser.role}`, { replace: true })
    }
  }, [activeUser, navigate])

  useEffect(() => {
    setRole(initialRole)
  }, [initialRole])

  const trimmed = name.trim()
  const canSubmit = !!activeAddress && trimmed.length > 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit || !activeAddress) return
    setSubmitting(true)
    setError(null)
    try {
      await registerUser(role, trimmed)
      await setActiveUser(activeAddress)
      navigate(`/dashboard/${role}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="font-ui">
      <Crumbs>
        <CrumbsList>
          <CrumbsItem>
            <CrumbsLink asChild>
              <Link to="/">Home</Link>
            </CrumbsLink>
          </CrumbsItem>
          <CrumbsSeparator />
          <CrumbsItem>
            <CrumbsPage>Join bxHive</CrumbsPage>
          </CrumbsItem>
        </CrumbsList>
      </Crumbs>

      <h1 className="t-display-l mt-4 mb-2">Welcome to bxHive.</h1>
      <p className="font-ui text-[15px] leading-[1.55] text-muted-foreground mt-1.5 mb-9 max-w-175">
        Choose how you want to join. You can hold both roles on the same wallet — but you can only act in one capacity per experiment.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        <RoleCard role="experimenter" selected={role === 'experimenter'} onSelect={() => setRole('experimenter')} />
        <RoleCard role="participant" selected={role === 'participant'} onSelect={() => setRole('participant')} />
      </div>

      <Panel>
        <div className="max-w-120">
          <Field label="Display name" hint="will appear on manifests and payouts" required htmlFor="join-name">
            <Input
              id="join-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'experimenter' ? 'Dr. Mira Karras' : 'Pseudonym or initials'}
              autoComplete="off"
              maxLength={64}
            />
          </Field>
        </div>
      </Panel>

      <div className="mt-5 px-4 py-3.5 border border-dashed border-rule-2 rounded-sm bg-muted flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3.5">
          <span className="size-8 rounded-sm bg-card border border-border grid place-items-center font-mono text-sm text-primary">◈</span>
          <div>
            <div className="font-ui font-semibold text-sm text-foreground">
              {activeAddress ? 'Wallet connected' : 'Connect your Algorand wallet'}
            </div>
            <div className="font-ui text-[12px] text-muted-foreground">
              {activeAddress ? truncateAddress(activeAddress) : 'Pera · Defly · Lute · WalletConnect supported.'}
            </div>
          </div>
        </div>
        {activeAddress ? (
          <Chip tone="pos">
            <Check className="size-3" /> Connected
          </Chip>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Btn variant="secondary" size="sm">
                Connect <ArrowRight className="size-3.5" />
              </Btn>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuLabel>Available wallets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {wallets?.map((wallet) => (
                <DropdownMenuItem key={wallet.id} onSelect={() => void wallet.connect()}>
                  {wallet.metadata.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {error && <div className="mt-4 p-3 rounded-sm border border-neg/35 bg-neg-bg text-neg text-[13px]">{error}</div>}

      <div className="mt-7 pt-5 border-t border-border flex items-center justify-between gap-3 flex-wrap">
        <span className="font-ui text-[12px] text-muted-foreground">By continuing you agree to the research participation terms.</span>
        <div className="flex gap-2.5">
          <Btn asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="size-3.5" /> Back
            </Link>
          </Btn>
          <Btn variant="primary" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Joining…
              </>
            ) : (
              <>
                Join <ArrowRight className="size-3.5" />
              </>
            )}
          </Btn>
        </div>
      </div>
    </div>
  )
}

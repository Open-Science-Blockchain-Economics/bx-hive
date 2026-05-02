import { Link } from 'react-router-dom'
import { ArrowRight, FlaskConical, TriangleAlert, User } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Dot } from '@/components/ds/dot'
import { HexGrid } from '@/components/ds/hex-grid'
import { Wordmark } from '@/components/ds/wordmark'

interface RoleCardProps {
  icon: 'start' | 'exp' | 'part'
  title: string
  body: string
  cta: string
}

function RoleCard({ icon, title, body, cta }: RoleCardProps) {
  const Icon = icon === 'start' ? TriangleAlert : icon === 'exp' ? FlaskConical : User
  return (
    <div className="bg-card border border-border rounded-md p-7 flex flex-col gap-3">
      <div className="size-9 rounded-sm bg-primary text-primary-foreground grid place-items-center mb-1">
        <Icon className="size-4.5" strokeWidth={1.6} />
      </div>
      <h3 className="t-h1 mt-1">{title}</h3>
      <p className="t-small text-muted-foreground leading-[1.55] m-0">{body}</p>
      <div className="mt-1.5">
        <Btn variant="ghost" size="sm" className="-ml-3">
          {cta} <ArrowRight className="size-3.5" />
        </Btn>
      </div>
    </div>
  )
}

function MarketingNav() {
  return (
    <header className="flex items-center justify-between px-7 py-3.5 border-b border-border bg-background">
      <div className="flex items-center gap-7">
        <Link to="/" className="flex items-center">
          <Wordmark size={16} />
        </Link>
        <nav className="flex items-center gap-5 font-ui text-[13px] tracking-[-0.005em]">
          <a href="#about" className="text-foreground font-semibold pb-0.5 border-b border-primary">
            Home
          </a>
          <a href="#methods" className="text-muted-foreground hover:text-foreground transition-colors">
            Methods
          </a>
          <a
            href="https://open-science-blockchain-economics.github.io/bx-hive/getting-started/overview/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Btn variant="ghost" size="sm">
          Sign in
        </Btn>
        <Btn variant="primary" size="sm">
          Connect wallet
        </Btn>
      </div>
    </header>
  )
}

export default function MarketingSans() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="relative px-20 pt-26 pb-24 overflow-hidden">
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <HexGrid opacity={0.55} />
        </div>
        <div className="relative max-w-[1100px]">
          <span className="t-micro inline-flex items-center gap-2.5">
            <Dot tone="accent" /> ON-CHAIN BEHAVIORAL ECONOMICS · ALGORAND
          </span>
          <h1 className="font-ui font-medium text-[72px] leading-[1.02] tracking-[-0.025em] mt-5 max-w-[920px]">
            Run economic experiments
            <br />
            <span className="font-display italic font-normal text-primary tracking-[-0.02em]">with verifiable</span> participants.
          </h1>
          <p className="font-ui text-base leading-[1.55] mt-5 max-w-[600px] text-ink-2">
            bxHive is a research instrument for designing, deploying and analyzing incentivized economic games. Participants join with a
            wallet, decisions are settled on-chain, and your dataset is reproducible by construction.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Btn variant="primary" size="lg">
              Join as Experimenter <ArrowRight className="size-4" />
            </Btn>
            <Btn variant="secondary" size="lg">
              Join as Participant <ArrowRight className="size-4" />
            </Btn>
            <span className="w-px h-5.5 bg-rule-2 mx-1" />
            <Btn variant="ghost" size="lg">
              Read the docs
            </Btn>
          </div>
        </div>
      </section>

      {/* What is bxHive? */}
      <section id="about" className="px-20 py-22 bg-muted border-y border-border">
        <div className="text-center max-w-[720px] mx-auto mb-14">
          <span className="t-micro">ABOUT</span>
          <h2 className="font-ui font-medium text-5xl leading-[1.08] tracking-[-0.025em] mt-3 mb-3.5">What is bxHive?</h2>
          <p className="t-body text-muted-foreground text-base leading-[1.55] m-0">
            bxHive is a platform for verifiable human experiments that uses Algorand smart contracts to automate research and transparently
            manage payouts.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1180px] mx-auto">
          <RoleCard
            icon="start"
            title="Getting started"
            body="Learn the fundamentals of bxHive and how to set up your account to begin using the platform — wallet, identity, and the lab basics."
            cta="Read the primer"
          />
          <RoleCard
            icon="exp"
            title="Experimenters"
            body="Discover how to design, fund, and manage your own verifiable experiments using our templates. Specify base parameters once; deploy variations with a click."
            cta="For researchers"
          />
          <RoleCard
            icon="part"
            title="Participants"
            body="Understand how to participate in active research and receive transparent, automated payouts for your contributions. Settled on-chain after every round."
            cta="For participants"
          />
        </div>
      </section>

      {/* Protocol */}
      <section className="px-20 py-22">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-16 max-w-[1280px] mx-auto">
          <div>
            <span className="t-micro">PROTOCOL</span>
            <h2 className="font-ui font-medium text-3xl leading-[1.15] tracking-[-0.02em] mt-2.5">From hypothesis to dataset.</h2>
            <p className="t-small text-muted-foreground mt-3">Four stages, fully reproducible from the on-chain manifest.</p>
          </div>
          <ol className="list-none p-0 m-0 flex flex-col gap-1">
            {(
              [
                ['01', 'Specify', 'Choose a template, fix base parameters, declare your variations.'],
                ['02', 'Recruit', 'Participants join with an Algorand wallet; assignment is randomized and logged.'],
                ['03', 'Run', 'Matches play to completion; every decision is timestamped on-chain.'],
                ['04', 'Settle', 'Payouts execute automatically. Export the run as CSV or signed JSON.'],
              ] as const
            ).map(([n, h, d]) => (
              <li key={n} className="grid grid-cols-[60px_240px_1fr] py-5 items-baseline border-t border-border">
                <span className="font-mono text-[13px] text-primary">{n}</span>
                <span className="font-ui font-semibold text-[22px] tracking-[-0.01em]">{h}</span>
                <span className="t-body text-ink-2">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Quote */}
      <section className="px-20 py-18 bg-muted border-y border-border">
        <div className="max-w-[880px] mx-auto flex gap-6 items-start">
          <span className="font-display text-[80px] leading-[0.6] text-primary">“</span>
          <div>
            <p className="font-display italic text-[26px] leading-[1.4] tracking-[-0.005em] m-0">
              An audit-trail-first replacement for the lab. We replicated Berg, Dickhaut &amp; McCabe in a week.
            </p>
            <div className="mt-4 flex items-center gap-2.5 text-muted-foreground">
              <span className="w-7 h-px bg-rule-2" />
              <span className="t-small">Dr. M. Karras · Behavioral Lab, ETH</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-20 py-22 text-center">
        <h3 className="font-ui font-medium text-3xl leading-[1.15] tracking-[-0.02em]">Bring your hypothesis. We'll handle the ledger.</h3>
        <div className="mt-7 inline-flex gap-3">
          <Btn variant="primary" size="lg">
            Join as Experimenter <ArrowRight className="size-4" />
          </Btn>
          <Btn variant="secondary" size="lg">
            Join as Participant <ArrowRight className="size-4" />
          </Btn>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-20 py-8 border-t border-border flex justify-between items-center">
        <Wordmark size={18} />
        <div className="flex gap-7 font-ui text-xs text-muted-foreground">
          <span>Open Science · Blockchain · Economics</span>
          <span>Documentation</span>
          <span>GitHub</span>
          <span>Methods paper</span>
        </div>
      </footer>
    </div>
  )
}

import { ArrowRight, FlaskConical, TriangleAlert, User } from 'lucide-react'

import { PillBtn } from '@/components/ui'
import { cn } from '@/lib/utils'

interface RoleCardProps {
  title: string
  body: string
  icon: 'start' | 'exp' | 'part'
  cta: string
}

function RoleCard({ title, body, icon, cta }: RoleCardProps) {
  const Icon = icon === 'start' ? TriangleAlert : icon === 'exp' ? FlaskConical : User
  return (
    <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-3">
      <div className="size-9 rounded-sm bg-primary text-primary-foreground grid place-items-center mb-2">
        <Icon className="size-4.5" strokeWidth={1.6} />
      </div>
      <div className="font-ui text-2xl font-medium tracking-[-0.012em] mt-1">
        <span className="font-display italic font-normal">{title}</span>
      </div>
      <p className="font-ui text-[15px] leading-[1.5] text-ink-2 m-0">{body}</p>
      <div className="mt-2">
        <PillBtn size="sm" kind="ghost" className="-ml-4">
          {cta} <ArrowRight className="size-3.5" />
        </PillBtn>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 pb-14 md:pt-30 md:pb-24 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <h1 className="font-ui font-medium text-[44px] md:text-[64px] lg:text-[88px] leading-none tracking-[-0.025em] max-w-[1180px]">
            Run economic experiments
            <br />
            <span className="font-display italic font-normal text-primary tracking-[-0.02em]">with verifiable</span> participants.
          </h1>
          <p className="font-ui text-lg leading-[1.55] mt-7 max-w-[660px] text-ink-2">
            bxHive is a research instrument for designing, deploying and analyzing incentivized economic games. Participants join with a
            wallet, decisions are settled on-chain, and your dataset is reproducible by construction.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PillBtn to="/join?role=experimenter">
              Join as Experimenter <ArrowRight className="size-4" />
            </PillBtn>
            <PillBtn kind="secondary" to="/join?role=participant">
              Join as Participant <ArrowRight className="size-4" />
            </PillBtn>
          </div>
        </div>
      </section>

      {/* What is bxHive? */}
      <section id="about" className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border">
        <div className="text-center max-w-[780px] mx-auto mb-14">
          <h2 className="font-ui font-medium text-[36px] md:text-[56px] leading-none tracking-[-0.025em] mb-4">
            What is <span className="font-display italic font-normal text-primary">bxHive</span>?
          </h2>
          <p className="font-ui text-lg leading-[1.55] text-ink-2">
            A platform for verifiable human experiments that uses Algorand smart contracts to automate research and transparently manage
            payouts.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1240px] mx-auto">
          <RoleCard
            title="Getting started"
            icon="start"
            body="Learn the fundamentals of bxHive and how to set up your account — wallet, identity, and the laboratory basics."
            cta="Read the primer"
          />
          <RoleCard
            title="Experimenters"
            icon="exp"
            body="Design, fund, and manage verifiable experiments using canonical templates. Specify base parameters once; deploy variations atomically."
            cta="For researchers"
          />
          <RoleCard
            title="Participants"
            icon="part"
            body="Participate in active research and receive transparent, automated payouts. Settled on-chain after every round."
            cta="For participants"
          />
        </div>
      </section>

      {/* Protocol */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-30">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-10 md:gap-16 max-w-[1280px] mx-auto">
          <div>
            <h2 className="font-ui font-medium text-[36px] md:text-[56px] leading-none tracking-[-0.025em]">
              From hypothesis
              <br />
              <span className="font-display italic font-normal text-primary">to dataset.</span>
            </h2>
            <p className="font-ui text-[15px] text-muted-foreground mt-4">Four stages, fully reproducible from the on-chain manifest.</p>
          </div>
          <ol className="list-none p-0 m-0">
            {(
              [
                ['i.', 'Specify', 'Choose a template, fix base parameters, declare your variations.'],
                ['ii.', 'Recruit', 'Participants join with an Algorand wallet; assignment is randomized and logged.'],
                ['iii.', 'Run', 'Matches play to completion; every decision is timestamped on-chain.'],
                ['iv.', 'Settle', 'Payouts execute automatically. Export the run as CSV or signed JSON.'],
              ] as const
            ).map(([n, h, d], i, arr) => (
              <li
                key={n}
                className={cn(
                  'grid grid-cols-1 md:grid-cols-[60px_240px_1fr] gap-1 md:gap-0 py-5 md:py-7 md:items-baseline border-t border-border',
                  i === arr.length - 1 && 'border-b border-border',
                )}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{n}</span>
                <span className="font-display italic font-normal text-2xl md:text-3xl tracking-[-0.015em] text-foreground">{h}</span>
                <span className="font-ui text-[17px] leading-[1.55] text-ink-2">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Quote */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-y border-border">
        <div className="max-w-[980px] mx-auto text-center">
          <span className="font-display italic text-[56px] md:text-[80px] leading-[0.5] text-primary">“</span>
          <p className="font-display italic font-light text-[24px] md:text-[38px] leading-[1.3] tracking-[-0.012em] mt-4 max-w-[880px] mx-auto">
            An audit-trail-first replacement for the lab. We replicated Berg, Dickhaut &amp; McCabe in a week.
          </p>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mt-7">
            Dr. M. Karras — Behavioral Lab, ETH
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-30 text-center">
        <h3 className="font-ui font-medium text-[40px] md:text-[64px] leading-none tracking-[-0.025em]">
          Bring your hypothesis.
          <br />
          <span className="font-display italic font-normal text-primary">We'll handle the ledger.</span>
        </h3>
        <div className="mt-9 inline-flex flex-wrap justify-center gap-3">
          <PillBtn to="/join?role=experimenter">
            Join as Experimenter <ArrowRight className="size-4" />
          </PillBtn>
          <PillBtn kind="secondary" to="/join?role=participant">
            Join as Participant <ArrowRight className="size-4" />
          </PillBtn>
        </div>
      </section>
    </>
  )
}

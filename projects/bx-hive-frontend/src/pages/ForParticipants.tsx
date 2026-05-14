import { ArrowDown, ArrowRight } from 'lucide-react'

import { HexMark } from '@/components/ds/hex-mark'
import { PillBtn } from '@/components/ui'

const PARTICIPANT_CARD = [
  ['Pseudonym', '@—'],
  ['Studies joined', '0'],
  ['Earned', '—'],
] as const

const FLOW_STATIONS = ['your choice', 'public dataset', 'open science'] as const

const PAYOUT_ROWS = [
  ['Session', 'complete'],
  ['Pays', 'digital currency'],
  ['To', 'your wallet'],
] as const

const SESSION_ROWS = [
  ['Estimated', 'short, single-sitting'],
  ['Requires', 'a wallet, your time'],
  ['Results', 'visible after it settles'],
] as const

const START_STEPS = [
  ['01', 'Connect wallet', 'Any supported wallet, takes a minute.'],
  ['02', 'Sign up', 'Pick a pseudonym.'],
  ['03', 'Browse studies', 'Join one when it fits.'],
  ['04', 'Finish session', 'Payment lands automatically.'],
] as const

export default function ForParticipants() {
  return (
    <>
      {/* Hero — mission + participant-card preview */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 pb-20 md:pt-24 md:pb-28 border-b border-border">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 lg:items-center">
          <div>
            <h1 className="font-ui font-medium text-[40px] md:text-[56px] lg:text-[64px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
              Real decisions.
              <br />
              <span className="font-display italic font-normal text-primary tracking-[-0.02em]">Real research</span>.
            </h1>
            <p className="font-ui text-lg leading-[1.55] mt-7 max-w-[560px] text-ink-2">
              Participate in real behavioral research, contribute to a public dataset, and get paid in digital currency for your time.
            </p>
            <div className="mt-9">
              <PillBtn to="/join?role=participant">
                Join <ArrowRight className="size-4" />
              </PillBtn>
            </div>
          </div>
          {/* Participant card preview — stylized membership/passport visual */}
          <div className="bg-card border border-border rounded-2xl p-7">
            <div className="flex items-center gap-2.5 pb-5 border-b border-border">
              <HexMark size={16} className="text-primary" />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">bxHive · member</span>
            </div>
            <dl className="space-y-5 mt-6 m-0">
              {PARTICIPANT_CARD.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground m-0 mb-1">{label}</dt>
                  <dd className="font-display italic font-normal text-2xl tracking-[-0.012em] text-foreground m-0">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* §1 Contribute — body + flow-diagram artifact */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">i. Contribute</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 lg:items-center">
            <div>
              <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
                Help science answer the questions
                <br />
                <span className="font-display italic font-normal text-primary">only people can</span>.
              </h2>
              <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[560px] text-ink-2">
                bxHive runs behavioral research — studies that need real people making real decisions. Your choices contribute to a public,
                replicable dataset, while your identity remains private.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-6">your decisions become</div>
              <div className="flex flex-col items-center gap-4">
                {FLOW_STATIONS.map((label, i, arr) => (
                  <div key={label} className="flex flex-col items-center gap-4">
                    <div className="font-display italic font-normal text-xl md:text-2xl tracking-[-0.012em] text-foreground">{label}</div>
                    {i < arr.length - 1 && <ArrowDown className="size-4 text-primary" strokeWidth={1.5} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* §2 Earn — flipped: artifact left, text right (desktop) */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">ii. Earn</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 md:gap-16 lg:items-center">
            <div className="order-1 lg:order-2">
              <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
                Paid <span className="font-display italic font-normal text-primary">the moment</span>
                <br />
                you finish.
              </h2>
              <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[560px] text-ink-2">
                Each study pays you in digital currency when you complete a session. The study runs on a smart contract, so the payment
                lands in your wallet automatically — no chasing the researcher, no waiting on approval.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden order-2 lg:order-1">
              <div className="border-b border-border px-7 py-3 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">payout · 0001</span>
                <span className="font-mono text-[11px] text-primary">complete</span>
              </div>
              <dl className="p-7 m-0 space-y-4">
                {PAYOUT_ROWS.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground m-0">{label}</dt>
                    <dd className="font-ui text-[15px] text-foreground m-0">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t border-border px-7 py-3 text-center">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">automatic</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* §3 Sessions — body + session-card artifact */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">iii. Sessions</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 lg:items-center">
            <div>
              <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
                Open the app.
                <br />
                Make your choices.
                <br />
                <span className="font-display italic font-normal text-primary">Done</span>.
              </h2>
              <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[560px] text-ink-2">
                Studies are short and self-contained. You join when one is open, make your decisions through the app, and finish in one
                sitting. Results appear after the session settles.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-7">
              <div className="flex items-center gap-2.5 pb-5 border-b border-border">
                <HexMark size={16} className="text-primary" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">session card</span>
              </div>
              <dl className="space-y-5 mt-6 m-0">
                {SESSION_ROWS.map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground m-0 mb-1">{label}</dt>
                    <dd className="font-ui text-[15px] text-foreground m-0">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* §4 Start — full-width horizontal journey */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">iv. Start</div>
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
            Set up once.
            <br />
            Join <span className="font-display italic font-normal text-primary">whenever</span>.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 mt-12 md:gap-x-0">
            {START_STEPS.map(([n, verb, body]) => (
              <div key={n} className="border-t border-border pt-8 pr-6 pb-2">
                <HexMark size={24} className="text-primary mb-4" />
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-2">{n}</div>
                <div className="font-display italic font-normal text-2xl tracking-[-0.012em] text-foreground mb-2">{verb}</div>
                <div className="font-ui text-[14px] leading-[1.5] text-ink-2">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-30 text-center bg-muted">
        <h3 className="font-ui font-medium text-[36px] md:text-[56px] leading-none tracking-[-0.025em]">
          Ready to join
          <br />
          <span className="font-display italic font-normal text-primary">a study</span>?
        </h3>
        <div className="mt-9 inline-flex flex-wrap justify-center gap-3">
          <PillBtn to="/join?role=participant">
            Join <ArrowRight className="size-4" />
          </PillBtn>
        </div>
      </section>
    </>
  )
}

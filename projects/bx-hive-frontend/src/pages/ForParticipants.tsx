import { ArrowRight } from 'lucide-react'

import { PillBtn } from '@/components/ui'
import { cn } from '@/lib/utils'

const START_STEPS = [
  ['01', 'Connect a wallet', 'Any supported wallet, takes a minute.'],
  ['02', 'Sign up', 'Pick a pseudonym.'],
  ['03', 'Browse studies', 'Join one when it fits.'],
  ['04', 'Finish a session', 'Payment lands automatically.'],
] as const

export default function ForParticipants() {
  return (
    <>
      {/* Intro hero */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 pb-14 md:pt-24 md:pb-20 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-6">For Participants</div>
          <h1 className="font-ui font-medium text-[40px] md:text-[56px] lg:text-[72px] leading-none tracking-[-0.025em] max-w-[900px]">
            Real decisions.
            <br />
            <span className="font-display italic font-normal text-primary tracking-[-0.02em]">Real research</span>.
          </h1>
          <p className="font-ui text-lg leading-[1.55] mt-7 max-w-[660px] text-ink-2">
            Participate in real behavioral research, contribute to a public dataset, and get paid in digital currency for your time.
          </p>
        </div>
      </section>

      {/* §1 Contribute */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">i. Contribute</div>
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[760px]">
            Help science answer the questions
            <br />
            <span className="font-display italic font-normal text-primary">only people can</span>.
          </h2>
          <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[680px] text-ink-2">
            bxHive runs behavioral research — studies that need real people making real decisions. Your choices contribute to a public,
            replicable dataset, while your identity remains private.
          </p>
        </div>
      </section>

      {/* §2 Earn */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">ii. Earn</div>
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[760px]">
            Paid <span className="font-display italic font-normal text-primary">the moment</span>
            <br />
            you finish.
          </h2>
          <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[680px] text-ink-2">
            Each study pays you in digital currency when you complete a session. The study runs on a smart contract, so the payment lands in
            your wallet automatically — no chasing the researcher, no waiting on approval.
          </p>
        </div>
      </section>

      {/* §3 Sessions */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">iii. Sessions</div>
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[760px]">
            Open the app.
            <br />
            Make your choices.
            <br />
            <span className="font-display italic font-normal text-primary">Done</span>.
          </h2>
          <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[680px] text-ink-2">
            Studies are short and self-contained. You join when one is open, make your decisions through the app, and finish in one sitting.
            Results appear after the session settles.
          </p>
        </div>
      </section>

      {/* §4 Start */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">iv. Start</div>
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[760px]">
            Set up once.
            <br />
            Join <span className="font-display italic font-normal text-primary">whenever</span>.
          </h2>
          <ol className="list-none p-0 m-0 mt-10">
            {START_STEPS.map(([n, h, d], i, arr) => (
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

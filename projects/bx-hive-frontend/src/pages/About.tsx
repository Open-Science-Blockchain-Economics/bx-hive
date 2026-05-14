import { Download, Play } from 'lucide-react'

import { HexGrid } from '@/components/ds/hex-grid'
import { HexMark } from '@/components/ds/hex-mark'
import ProtocolStages from '@/components/landing/ProtocolStages'

const PILLARS = [
  {
    title: 'Transparency',
    body: 'Every decision, enrollment, and payout is recorded on-chain. Anyone can verify the history.',
  },
  {
    title: 'Trustlessness',
    body: 'Escrow is held by the contract, not the experimenter. The rules execute themselves; no one can withhold a payout.',
  },
  {
    title: 'Immutability',
    body: 'Once recorded, results cannot be changed. The audit trail is permanent — and public.',
  },
] as const

const RESOURCES = [
  {
    title: 'Slide deck',
    body: "A 20-minute deck on the platform's design and current research direction.",
    cta: 'View PDF',
    href: '#',
  },
  {
    title: 'Recorded talk',
    body: 'A conference talk introducing bxHive and the trust-experiment template.',
    cta: 'Watch',
    href: '#',
  },
] as const

export default function About() {
  return (
    <>
      {/* Hero — mission + video */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 pb-20 md:pt-24 md:pb-28 border-b border-border">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 lg:items-center">
          <h1 className="font-ui font-medium text-[40px] md:text-[48px] lg:text-[56px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
            An audit-trail-first
            <br />
            replacement for the
            <br />
            <span className="font-display italic font-normal text-primary">behavioral economics lab</span>.
          </h1>
          <div>
            {/* TODO: replace placeholder with embedded platform tour video */}
            <div className="aspect-video w-full bg-foreground text-background grid place-items-center rounded-2xl">
              <Play className="size-16" strokeWidth={1.2} />
            </div>
            <p className="font-ui text-[15px] text-muted-foreground mt-4">90 seconds — what bxHive does.</p>
          </div>
        </div>
      </section>

      {/* §2 Why blockchain — muted bg with faint hex pattern overlay */}
      <section className="relative px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border overflow-hidden">
        <HexGrid opacity={0.06} aria-hidden="true" />
        <div className="relative max-w-[1240px] mx-auto">
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] mb-12">
            Why <span className="font-display italic font-normal text-primary">blockchain</span> matters.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PILLARS.map(({ title, body }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-3">
                <HexMark size={28} className="text-primary mb-2" />
                <div className="font-ui text-2xl font-medium tracking-[-0.012em]">
                  <span className="font-display italic font-normal">{title}</span>
                </div>
                <p className="font-ui text-[15px] leading-[1.5] text-ink-2 m-0">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §3 White paper */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] mb-10">
            Read the <span className="font-display italic font-normal text-primary">paper</span>.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 md:gap-14 md:items-center">
            <div className="relative">
              <div className="absolute inset-0 translate-x-3 translate-y-3 bg-primary rounded-md" aria-hidden="true" />
              <div className="relative aspect-[3/4] bg-card border border-border rounded-md grid place-items-center">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">White paper</span>
              </div>
            </div>
            <div>
              <p className="font-ui text-[17px] leading-[1.55] text-ink-2 max-w-[560px]">
                The bxHive paper documents the research motivation, protocol design, and cryptoeconomic settlement model behind the
                platform.
              </p>
              {/* TODO: link to the actual PDF when published */}
              <a
                href="#"
                className="mt-7 inline-flex items-center gap-2 rounded-pill bg-foreground text-background border border-foreground px-5 py-3 text-[15px] font-medium tracking-[-0.005em] hover:bg-foreground/90 transition-colors"
              >
                Download PDF <Download className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* §4 Protocol */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] mb-10">
            How an <span className="font-display italic font-normal text-primary">experiment</span> runs.
          </h2>
          <ProtocolStages />
        </div>
      </section>

      {/* §5 Resources */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-[1240px] mx-auto">
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] mb-10">
            Going <span className="font-display italic font-normal text-primary">deeper</span>.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {RESOURCES.map(({ title, body, cta, href }) => (
              <a
                key={title}
                href={href}
                className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-3 hover:border-foreground transition-colors"
              >
                <HexMark size={24} className="text-primary mb-2" />
                <div className="font-ui text-xl font-medium tracking-[-0.012em]">
                  <span className="font-display italic font-normal">{title}</span>
                </div>
                <p className="font-ui text-[15px] leading-[1.5] text-ink-2 m-0">{body}</p>
                <div className="font-ui text-[15px] mt-3">{cta} →</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

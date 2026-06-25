import { ArrowRight } from 'lucide-react'

import { PillBtn } from '@/components/ui'

const STATUS_ROWS = [
  { id: 'v1', state: 'running', running: 14, settled: 12 },
  { id: 'v2', state: 'running', running: 11, settled: 13 },
  { id: 'v3', state: 'partial', running: 6, settled: 8 },
  { id: 'v4', state: 'idle', running: 0, settled: 0 },
] as const

const STATUS_DOT: Record<(typeof STATUS_ROWS)[number]['state'], string> = {
  running: '●',
  partial: '◐',
  idle: '○',
}

export default function ForExperimenters() {
  return (
    <>
      {/* Hero — mission + sample manifest */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 pb-20 md:pt-24 md:pb-28 border-b border-border">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 lg:items-center">
          <div>
            <h1 className="font-ui font-medium text-[40px] md:text-[48px] lg:text-[56px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
              An experiment platform designed for <span className="font-display italic font-normal text-primary">reproducibility</span>.
            </h1>
            <p className="font-ui text-lg leading-[1.55] mt-7 max-w-[560px] text-ink-2">
              For behavioral economists, social scientists, and academic research groups. Design treatments, fund them on-chain, and export
              the full run as a verifiable record.
            </p>
            <div className="mt-9">
              <PillBtn to="/join?role=experimenter">
                Sign up as Experimenter <ArrowRight className="size-4" />
              </PillBtn>
            </div>
          </div>
          {/* Stylized experiment manifest — not real syntax, conveys the "spec'd instrument" character */}
          <div className="bg-muted border border-border rounded-2xl overflow-hidden">
            <div className="border-b border-border px-5 py-3 flex items-center justify-between bg-card">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">experiment.yaml</span>
              <span className="font-mono text-[11px] text-muted-foreground">draft</span>
            </div>
            <pre className="font-mono text-[13px] leading-[1.65] text-foreground p-5 m-0 whitespace-pre">
              {`name: replication_v2
template: trust_v1
participants: 60
variations:
  - { E1: 10, m: 3 }
  - { E1: 20, m: 2 }
  - { E1: 10, m: 5 }
  - { E1: 20, m: 5 }
funding: <escrow>
export: csv | json`}
            </pre>
          </div>
        </div>
      </section>

      {/* §1 DESIGN */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">i. Design</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 lg:items-center">
            <div>
              <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
                Designing your <span className="font-display italic font-normal text-primary">experiment</span>.
              </h2>
              <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[560px] text-ink-2">
                Pick a template, fix base parameters, declare which parameters to vary. The platform generates factorial combinations from
                your varied values and deploys each variation as its own contract. Everything else stays at base.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-4">design summary</div>
              <dl className="space-y-3 m-0">
                {[
                  ['Base parameters', 'set'],
                  ['Variation matrix', '4 (2 × 2)'],
                  ['Max matches / variation', '15'],
                  ['Assignment', 'round-robin'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between border-b border-border last:border-b-0 pb-3 last:pb-0">
                    <dt className="font-ui text-[14px] text-ink-2 m-0">{label}</dt>
                    <dd className="font-mono text-[13px] text-foreground m-0">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* §2 DEPLOY — flipped: artifact left, text right (desktop) */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">ii. Deploy</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 md:gap-16 lg:items-center">
            <div className="order-1 lg:order-2">
              <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
                Running it.
              </h2>
              <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[560px] text-ink-2">
                Open registration when you're ready. Participants self-enroll and are assigned to variations automatically. Monitor
                enrollment and match progress in real time as decisions land on the chain.
              </p>
            </div>
            <div className="bg-muted border border-border rounded-2xl overflow-hidden order-2 lg:order-1">
              <div className="border-b border-border px-5 py-3 flex items-center justify-between bg-card">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">match status</span>
                <span className="font-mono text-[11px] text-primary">live</span>
              </div>
              <table className="w-full">
                <tbody>
                  {STATUS_ROWS.map(({ id, state, running, settled }) => (
                    <tr key={id} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3 font-mono text-[13px] text-foreground w-12">{id}</td>
                      <td className="px-2 py-3 font-mono text-[15px] text-primary w-8">{STATUS_DOT[state]}</td>
                      <td className="px-5 py-3 font-mono text-[13px] text-ink-2">
                        <span className="text-foreground">{running}</span> running
                      </td>
                      <td className="px-5 py-3 font-mono text-[13px] text-ink-2">
                        <span className="text-foreground">{settled}</span> settled
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* §3 FUND */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-muted border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">iii. Fund</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 lg:items-center">
            <div>
              <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[640px]">
                <span className="font-display italic font-normal text-primary">Funding</span>, escrow-first.
              </h2>
              <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[560px] text-ink-2">
                Each variation is funded up front by the experimenter through escrow held in the smart contract. The escrow covers the
                worst-case payout for every pair; anything that isn't distributed is refunded when the experiment ends. The experimenter
                never holds participant funds.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-7">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-5">escrow model</div>
              <div className="space-y-4 font-mono text-[14px] text-foreground">
                <div className="flex items-baseline gap-3">
                  <span className="text-muted-foreground w-16">escrow</span>
                  <span className="text-primary">=</span>
                  <span>worst-case payout × number of pairs</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-muted-foreground w-16">payouts</span>
                  <span className="text-primary">=</span>
                  <span>what actually distributes</span>
                </div>
                <div className="flex items-baseline gap-3 pt-3 border-t border-border">
                  <span className="text-muted-foreground w-16">refund</span>
                  <span className="text-primary">=</span>
                  <span>escrow − payouts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* §4 EXPORT */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 border-b border-border">
        <div className="max-w-[1240px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary mb-5">iv. Export</div>
          <h2 className="font-ui font-medium text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-[760px]">
            The <span className="font-display italic font-normal text-primary">data</span> you get back.
          </h2>
          <p className="font-ui text-[17px] leading-[1.55] mt-7 max-w-[680px] text-ink-2">
            Every enrollment, decision, and payout is recorded on the blockchain. Pull a run as CSV for analysis or as signed JSON for audit
            and replication. The manifest hash is part of the record, so anyone can verify the experiment's design from the data alone.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
            <div className="bg-muted border border-border rounded-2xl overflow-hidden">
              <div className="border-b border-border px-5 py-3 flex items-center justify-between bg-card">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">run.csv</span>
                <span className="font-mono text-[11px] text-muted-foreground">for analysis</span>
              </div>
              <pre className="font-mono text-[12px] leading-[1.7] text-foreground p-5 m-0 overflow-x-auto whitespace-pre">
                {`match_id, variation, i_sent, t_returned
001, v1,  6,  12
002, v1, 10,   0
003, v2,  4,  10
004, v2,  0,   0`}
              </pre>
            </div>
            <div className="bg-muted border border-border rounded-2xl overflow-hidden">
              <div className="border-b border-border px-5 py-3 flex items-center justify-between bg-card">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">run.json</span>
                <span className="font-mono text-[11px] text-muted-foreground">for audit</span>
              </div>
              <pre className="font-mono text-[12px] leading-[1.7] text-foreground p-5 m-0 overflow-x-auto whitespace-pre">
                {`{
  "manifest": { ... },
  "variations": [ ... ],
  "matches":    [ ... ],
  "signature":  "0x..."
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-30 text-center bg-muted">
        <h3 className="font-ui font-medium text-[36px] md:text-[56px] leading-none tracking-[-0.025em]">
          Run the
          <br />
          <span className="font-display italic font-normal text-primary">experiment</span>.
        </h3>
        <div className="mt-9 inline-flex flex-wrap justify-center gap-3">
          <PillBtn to="/join?role=experimenter">
            Sign up as Experimenter <ArrowRight className="size-4" />
          </PillBtn>
        </div>
      </section>
    </>
  )
}

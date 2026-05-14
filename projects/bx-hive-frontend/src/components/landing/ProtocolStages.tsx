import { cn } from '@/lib/utils'

const STAGES = [
  ['i.', 'Specify', 'Choose a template, fix base parameters, declare your variations.'],
  ['ii.', 'Recruit', 'Participants join with a wallet; assignment is randomized and logged.'],
  ['iii.', 'Run', 'Matches play to completion; every decision is timestamped on-chain.'],
  ['iv.', 'Settle', 'Payouts execute automatically. Export the run as CSV or signed JSON.'],
] as const

export default function ProtocolStages() {
  return (
    <ol className="list-none p-0 m-0">
      {STAGES.map(([n, h, d], i, arr) => (
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
  )
}

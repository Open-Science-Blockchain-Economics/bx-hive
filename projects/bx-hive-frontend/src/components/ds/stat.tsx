import * as React from 'react'

import { cn } from '@/lib/utils'

interface StatProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  label: React.ReactNode
  value: React.ReactNode
  unit?: React.ReactNode
  sub?: React.ReactNode
  align?: 'left' | 'right'
}

function Stat({ label, value, unit, sub, align = 'left', className, ...props }: StatProps) {
  return (
    <div
      data-slot="stat"
      data-align={align}
      className={cn('flex flex-col gap-1.5', align === 'right' ? 'items-end' : 'items-start', className)}
      {...props}
    >
      <span className="t-micro">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-medium leading-none tracking-[-0.01em] text-foreground">{value}</span>
        {unit && <span className="font-mono text-xs text-muted-foreground">{unit}</span>}
      </span>
      {sub && <span className="font-ui text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

export { Stat }

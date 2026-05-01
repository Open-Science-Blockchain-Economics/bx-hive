import * as React from 'react'

import { cn } from '@/lib/utils'

interface GaugeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  value?: number
  size?: number
}

function Gauge({ value = 0, size = 64, className, style, ...props }: GaugeProps) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100)
  return (
    <div
      data-slot="gauge"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('relative inline-block', className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth="2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-[13px] text-foreground">
        <span>
          {value}
          <span className="text-muted-foreground">%</span>
        </span>
      </div>
    </div>
  )
}

export { Gauge }

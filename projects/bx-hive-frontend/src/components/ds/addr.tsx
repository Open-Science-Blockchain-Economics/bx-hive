import * as React from 'react'

import { cn } from '@/lib/utils'

interface AddrProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: string
}

function Addr({ value, className, ...props }: AddrProps) {
  return (
    <span data-slot="addr" className={cn('font-mono text-xs tracking-[0.02em] text-ink-2', className)} {...props}>
      {value}
    </span>
  )
}

export { Addr }

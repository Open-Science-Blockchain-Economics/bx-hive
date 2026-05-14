import * as React from 'react'

import { cn } from '@/lib/utils'

import { HexMark } from './hex-mark'

interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number
}

function Wordmark({ size = 18, className, ...props }: WordmarkProps) {
  return (
    <span data-slot="wordmark" className={cn('inline-flex items-center gap-2 text-foreground', className)} {...props}>
      <HexMark size={size} />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: size + 2,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        bxHive
      </span>
    </span>
  )
}

export { Wordmark }

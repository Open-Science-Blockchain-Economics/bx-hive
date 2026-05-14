import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const dotVariants = cva('inline-block rounded-full align-middle shrink-0', {
  variants: {
    tone: {
      pos: 'bg-pos',
      warn: 'bg-warn',
      neg: 'bg-neg',
      info: 'bg-info',
      accent: 'bg-primary',
      muted: 'bg-faint',
    },
  },
  defaultVariants: {
    tone: 'pos',
  },
})

interface DotProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>, VariantProps<typeof dotVariants> {
  size?: number
}

function Dot({ tone, size = 7, className, style, ...props }: DotProps) {
  return (
    <span
      data-slot="dot"
      data-tone={tone}
      className={cn(dotVariants({ tone }), className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  )
}

export { Dot, dotVariants }

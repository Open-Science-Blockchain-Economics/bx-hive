import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const chipVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 px-2 py-0.5 rounded-pill border font-ui text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background outline-none [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      tone: {
        neutral: 'bg-transparent text-ink-2 border-rule-2',
        accent: 'bg-accent text-accent-foreground border-primary/35',
        pos: 'bg-pos-bg text-pos border-pos/35',
        warn: 'bg-warn-bg text-warn border-warn/35',
        neg: 'bg-neg-bg text-neg border-neg/35',
        info: 'bg-info-bg text-info border-info/35',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

function Chip({
  className,
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof chipVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'
  return <Comp data-slot="chip" data-tone={tone} className={cn(chipVariants({ tone }), className)} {...props} />
}

export { Chip, chipVariants }

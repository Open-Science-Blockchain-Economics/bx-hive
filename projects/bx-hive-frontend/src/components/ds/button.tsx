import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const btnVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm font-ui whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground border border-brand-2 font-semibold hover:bg-brand-2',
        secondary: 'bg-card text-foreground border border-rule-2 font-medium hover:bg-muted',
        ghost: 'bg-transparent text-ink-2 border border-transparent font-medium hover:bg-accent hover:text-accent-foreground',
        danger: 'bg-transparent text-neg border border-neg font-medium hover:bg-neg-bg',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-[34px] px-3.5 text-[13px]',
        lg: 'h-10 px-4 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

function Btn({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof btnVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp data-slot="btn" data-variant={variant} data-size={size} className={cn(btnVariants({ variant, size, className }))} {...props} />
  )
}

export { Btn, btnVariants }

import * as React from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

interface RuleProps extends Omit<React.ComponentProps<typeof SeparatorPrimitive.Root>, 'children'> {
  label?: React.ReactNode
}

function Rule({ className, orientation = 'horizontal', decorative = true, label, ...props }: RuleProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)} role="separator">
        <span className="t-micro">{label}</span>
        <span className="flex-1 h-px bg-border" />
      </div>
    )
  }
  return (
    <SeparatorPrimitive.Root
      data-slot="rule"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      {...props}
    />
  )
}

export { Rule }

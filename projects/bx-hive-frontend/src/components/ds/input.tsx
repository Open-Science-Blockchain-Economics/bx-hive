import * as React from 'react'

import { cn } from '@/lib/utils'

interface InputProps extends React.ComponentProps<'input'> {
  mono?: boolean
}

function Input({ className, type, mono = false, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-sm border border-input bg-card px-2.5 text-[13px] text-foreground transition-colors outline-none',
        'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        mono ? 'font-mono' : 'font-ui',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

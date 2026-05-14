import * as React from 'react'

import { cn } from '@/lib/utils'

interface PanelProps extends React.ComponentProps<'div'> {
  padded?: boolean
}

function Panel({ className, padded = true, ...props }: PanelProps) {
  return (
    <div
      data-slot="panel"
      className={cn('bg-card text-foreground border border-border rounded-sm', padded && 'p-5', className)}
      {...props}
    />
  )
}

export { Panel }

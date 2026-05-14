import * as React from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

function Crumbs({ className, ...props }: React.ComponentProps<'nav'>) {
  return <nav aria-label="breadcrumb" data-slot="crumbs" className={cn('font-ui text-xs', className)} {...props} />
}

function CrumbsList({ className, ...props }: React.ComponentProps<'ol'>) {
  return <ol data-slot="crumbs-list" className={cn('flex flex-wrap items-center gap-2 text-muted-foreground', className)} {...props} />
}

function CrumbsItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="crumbs-item" className={cn('inline-flex items-center gap-2', className)} {...props} />
}

function CrumbsLink({ asChild, className, ...props }: React.ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp data-slot="crumbs-link" className={cn('text-muted-foreground transition-colors hover:text-foreground', className)} {...props} />
  )
}

function CrumbsPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="crumbs-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-medium text-ink-2', className)}
      {...props}
    />
  )
}

function CrumbsSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li data-slot="crumbs-separator" role="presentation" aria-hidden="true" className={cn('text-faint', className)} {...props}>
      {children ?? '/'}
    </li>
  )
}

export { Crumbs, CrumbsList, CrumbsItem, CrumbsLink, CrumbsPage, CrumbsSeparator }

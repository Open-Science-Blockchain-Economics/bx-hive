import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

interface PillBtnProps {
  children: React.ReactNode
  kind?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'lg'
  className?: string
  to?: string
}

export default function PillBtn({ children, kind = 'primary', size = 'lg', className, to }: PillBtnProps) {
  const sizing = size === 'lg' ? 'px-5 py-3 text-[15px]' : 'px-4 py-2 text-[13px]'
  const variant =
    kind === 'primary'
      ? 'bg-foreground text-background border border-foreground hover:bg-foreground/90'
      : kind === 'secondary'
        ? 'bg-transparent text-foreground border border-foreground hover:bg-foreground/5'
        : 'bg-transparent text-foreground border border-transparent underline underline-offset-4 hover:no-underline'
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-[-0.005em] transition-colors',
    sizing,
    variant,
    className,
  )
  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={classes}>
      {children}
    </button>
  )
}

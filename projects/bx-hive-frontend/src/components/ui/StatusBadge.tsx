import { Chip } from '@/components/ds/badge'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusToTone: Record<string, 'pos' | 'info' | 'warn' | 'neutral' | 'neg' | 'accent'> = {
  active: 'pos',
  open: 'info',
  closed: 'warn',
  completed: 'neutral',
  ended: 'neg',
  waiting: 'neutral',
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const tone = statusToTone[status.toLowerCase()] ?? 'neutral'
  return (
    <Chip tone={tone} className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Chip>
  )
}

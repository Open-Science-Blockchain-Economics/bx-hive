import { Dot } from '@/components/ds/dot'
import { cn } from '@/lib/utils'

interface StatusDotProps {
  color: 'info' | 'warning' | 'error' | 'success' | 'base'
  label?: string
  pulse?: boolean
}

const colorToTone = {
  info: 'info',
  warning: 'warn',
  error: 'neg',
  success: 'pos',
  base: 'muted',
} as const

export default function StatusDot({ color, label, pulse = false }: StatusDotProps) {
  return <Dot tone={colorToTone[color]} aria-label={label} className={cn(pulse && 'animate-pulse')} />
}

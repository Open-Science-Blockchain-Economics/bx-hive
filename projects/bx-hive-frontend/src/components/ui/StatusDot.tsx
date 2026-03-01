interface StatusDotProps {
  color: 'info' | 'warning' | 'error' | 'success' | 'base'
  label?: string
  pulse?: boolean
}

const colorMap: Record<StatusDotProps['color'], string> = {
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error',
  success: 'bg-success',
  base: 'bg-base-300',
}

export default function StatusDot({ color, label, pulse = false }: StatusDotProps) {
  return <span className={`inline-block w-2 h-2 rounded-full ${colorMap[color]} ${pulse ? 'animate-pulse' : ''}`} aria-label={label} />
}

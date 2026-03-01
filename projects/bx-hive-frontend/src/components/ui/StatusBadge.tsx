type BadgeSize = 'sm' | 'md' | 'lg'

interface StatusBadgeProps {
  status: string
  size?: BadgeSize
  className?: string
}

const statusStyles: Record<string, string> = {
  active: 'badge-success',
  open: 'badge-info',
  closed: 'badge-warning',
  completed: 'badge-neutral',
  ended: 'badge-error',
  waiting: 'badge-ghost',
}

export default function StatusBadge({ status, size, className = '' }: StatusBadgeProps) {
  const colorClass = statusStyles[status.toLowerCase()] ?? 'badge-ghost'
  const sizeClass = size ? `badge-${size}` : ''
  return <span className={`badge ${colorClass} ${sizeClass} ${className}`.trim()}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

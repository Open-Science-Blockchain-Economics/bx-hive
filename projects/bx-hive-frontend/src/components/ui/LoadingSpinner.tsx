import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const

export default function LoadingSpinner({ size = 'lg', className = 'flex justify-center py-12' }: LoadingSpinnerProps) {
  return (
    <div className={className}>
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeMap[size])} />
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ size = 'lg', className = 'flex justify-center py-12' }: LoadingSpinnerProps) {
  return (
    <div className={className}>
      <span className={`loading loading-spinner loading-${size}`} />
    </div>
  )
}

import type { ReactNode } from 'react'

import { Panel } from '@/components/ds/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: ReactNode
  desc?: ReactNode
  figure?: ReactNode
  className?: string
}

export default function StatCard({ title, value, desc, figure, className }: StatCardProps) {
  return (
    <Panel className={cn('relative', className)}>
      {figure && <div className="absolute top-3 right-3">{figure}</div>}
      <div className="t-micro mb-1.5">{title}</div>
      <div className="font-mono text-2xl font-medium leading-none tracking-[-0.01em] text-foreground">{value}</div>
      {desc && <div className="text-xs text-muted-foreground mt-1.5">{desc}</div>}
    </Panel>
  )
}

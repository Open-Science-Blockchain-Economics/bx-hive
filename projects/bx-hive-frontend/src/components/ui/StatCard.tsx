import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: ReactNode
  desc?: ReactNode
  figure?: ReactNode
  className?: string
}

export default function StatCard({ title, value, desc, figure, className = '' }: StatCardProps) {
  return (
    <div className={`stat bg-base-200 rounded-box py-3 ${className}`.trim()}>
      {figure && <div className="stat-figure">{figure}</div>}
      <div className="stat-title">{title}</div>
      <div className="stat-value text-2xl">{value}</div>
      {desc && <div className="stat-desc">{desc}</div>}
    </div>
  )
}

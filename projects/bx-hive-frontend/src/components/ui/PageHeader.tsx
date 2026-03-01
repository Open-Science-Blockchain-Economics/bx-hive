import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  backTo: string
  backLabel?: string
  badges?: ReactNode
}

export default function PageHeader({ title, subtitle, backTo, backLabel = 'Back to Dashboard', badges }: PageHeaderProps) {
  return (
    <div>
      <Link to={backTo} className="btn btn-ghost btn-sm mb-4">
        {`\u2190 ${backLabel}`}
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <div className="flex items-center gap-2 mt-2">{subtitle}</div>}
        </div>
        {badges && <div className="flex items-center gap-2">{badges}</div>}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { FaArrowLeft } from 'react-icons/fa'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  backTo: string
  backTooltip?: string
  badges?: ReactNode
}

export default function PageHeader({ title, subtitle, backTo, backTooltip = 'Back to Dashboard', badges }: PageHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link to={backTo} className="tooltip tooltip-right btn btn-ghost btn-sm btn-square" data-tip={backTooltip}>
          <FaArrowLeft className="text-lg" />
        </Link>
        <h1 className="text-3xl font-bold">{title}</h1>
        {badges && <div className="flex items-center gap-2">{badges}</div>}
      </div>
      {subtitle && <div className="flex items-center gap-2 mt--2 ml-11">{subtitle}</div>}
    </div>
  )
}

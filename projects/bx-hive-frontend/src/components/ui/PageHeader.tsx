import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'

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
      <div className="flex items-center gap-3 mb-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={backTo}
              aria-label={backTooltip}
              className="inline-flex items-center justify-center size-8 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{backTooltip}</TooltipContent>
        </Tooltip>
        <h1 className="t-h1">{title}</h1>
        {badges && <div className="flex items-center gap-2">{badges}</div>}
      </div>
      {subtitle && <div className="flex items-center gap-2 ml-11 text-sm text-muted-foreground">{subtitle}</div>}
    </div>
  )
}

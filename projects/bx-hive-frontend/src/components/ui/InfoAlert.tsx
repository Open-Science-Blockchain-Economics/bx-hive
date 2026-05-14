import { ExternalLink, Info } from 'lucide-react'

import { cn } from '@/lib/utils'

interface InfoAlertProps {
  children: React.ReactNode
  learnMoreHref?: string
  className?: string
}

export default function InfoAlert({ children, learnMoreHref, className }: InfoAlertProps) {
  return (
    <div
      role="alert"
      className={cn('flex items-start gap-2.5 rounded-sm border border-info/35 bg-info-bg px-3 py-2.5 text-sm text-info', className)}
    >
      <Info className="size-4 shrink-0 mt-0.5" />
      <span>
        {children}
        {learnMoreHref && (
          <>
            {' — '}
            <a
              href={learnMoreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:no-underline"
            >
              Learn more
              <ExternalLink className="size-3" />
            </a>
          </>
        )}
      </span>
    </div>
  )
}

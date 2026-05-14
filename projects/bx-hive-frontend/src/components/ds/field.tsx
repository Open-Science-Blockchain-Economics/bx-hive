import * as React from 'react'

import { cn } from '@/lib/utils'

import { Label } from './label'

interface FieldProps {
  label: React.ReactNode
  hint?: React.ReactNode
  required?: boolean
  error?: React.ReactNode
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

function Field({ label, hint, required, error, htmlFor, className, children }: FieldProps) {
  return (
    <div data-slot="field" className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="justify-between">
        <span className="inline-flex items-baseline gap-1">
          {label}
          {required && <span className="text-primary">*</span>}
        </span>
        {hint && <span className="ml-auto text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
      {error && <span className="text-[11px] text-neg">{error}</span>}
    </div>
  )
}

export { Field }

import { useState } from 'react'
import { ArrowRight, User } from 'lucide-react'

import { Field } from '@/components/ds/field'
import { Input } from '@/components/ds/input'
import { cn } from '@/lib/utils'

interface TrustGameParametersProps {
  parameters: Record<string, number | string>
  onChange: (name: string, value: string, type: 'number') => void
}

type FocusedField = 'E1' | 'm' | 'E2' | 'UNIT' | null

export default function TrustGameParameters({ parameters, onChange }: TrustGameParametersProps) {
  const [focused, setFocused] = useState<FocusedField>(null)

  const investorActive = focused === 'E1'
  const arrowActive = focused === 'm'
  const trusteeActive = focused === 'E2'

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Inputs */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <Field label="Investor Endowment (E1)" htmlFor="param-E1" className="flex-1 min-w-35">
          <Input
            id="param-E1"
            mono
            type="number"
            value={parameters.E1 ?? ''}
            onChange={(e) => onChange('E1', e.target.value, 'number')}
            onFocus={() => setFocused('E1')}
            onBlur={() => setFocused(null)}
            min={1}
          />
        </Field>

        <Field label="Multiplier (m)" htmlFor="param-m" className="w-full sm:w-32 shrink-0">
          <Input
            id="param-m"
            mono
            type="number"
            className="text-center"
            value={parameters.m ?? ''}
            onChange={(e) => onChange('m', e.target.value, 'number')}
            onFocus={() => setFocused('m')}
            onBlur={() => setFocused(null)}
            min={1}
            max={10}
          />
        </Field>

        <Field label="Trustee Endowment (E2)" htmlFor="param-E2" className="flex-1 min-w-35">
          <Input
            id="param-E2"
            mono
            type="number"
            value={parameters.E2 ?? ''}
            onChange={(e) => onChange('E2', e.target.value, 'number')}
            onFocus={() => setFocused('E2')}
            onBlur={() => setFocused(null)}
            min={0}
          />
        </Field>
      </div>

      {/* Row 2: Icons + Arrow */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center gap-1 w-20 sm:w-32 shrink-0">
          <User className={cn('size-12 sm:size-16 transition-colors', investorActive ? 'text-primary' : 'text-faint')} />
          <span className="t-micro">Investor</span>
        </div>

        <div className="flex-1 flex items-center gap-2">
          <div className={cn('flex-1 border-t-2 border-dashed transition-colors', arrowActive ? 'border-primary/50' : 'border-faint')} />
          <ArrowRight className={cn('size-7 shrink-0 transition-colors', arrowActive ? 'text-primary' : 'text-faint')} />
          <div className={cn('flex-1 border-t-2 border-dashed transition-colors', arrowActive ? 'border-primary/50' : 'border-faint')} />
        </div>

        <div className="flex flex-col items-center gap-1 w-20 sm:w-32 shrink-0">
          <User className={cn('size-12 sm:size-16 transition-colors', trusteeActive ? 'text-primary' : 'text-faint')} />
          <span className="t-micro">Trustee</span>
        </div>
      </div>

      {/* Row 3: Step Size */}
      <div className="flex justify-center">
        <Field label="Step Size (UNIT)" htmlFor="param-UNIT" className="w-full sm:w-40">
          <Input
            id="param-UNIT"
            mono
            type="number"
            className="text-center"
            value={parameters.UNIT ?? ''}
            onChange={(e) => onChange('UNIT', e.target.value, 'number')}
            onFocus={() => setFocused('UNIT')}
            onBlur={() => setFocused(null)}
            min={1}
          />
        </Field>
      </div>
    </div>
  )
}

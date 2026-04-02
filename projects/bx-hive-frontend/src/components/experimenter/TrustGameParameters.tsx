import { useState } from 'react'
import { FaArrowRight, FaUser } from 'react-icons/fa'

interface TrustGameParametersProps {
  parameters: Record<string, number | string>
  onChange: (name: string, value: string, type: 'number') => void
}

type FocusedField = 'E1' | 'm' | 'E2' | 'UNIT' | null

export default function TrustGameParameters({ parameters, onChange }: TrustGameParametersProps) {
  const [focused, setFocused] = useState<FocusedField>(null)

  const investorColor = focused === 'E1' ? 'text-primary' : 'text-base-content/20'
  const arrowColor = focused === 'm' ? 'text-primary' : 'text-base-content/15'
  const lineColor = focused === 'm' ? 'border-primary/50' : 'border-base-content/15'
  const trusteeColor = focused === 'E2' ? 'text-primary' : 'text-base-content/20'

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Inputs */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {/* E1 */}
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Investor Endowment (E1)</legend>
          <input
            type="number"
            className="input input-bordered w-full"
            value={parameters.E1 ?? ''}
            onChange={(e) => onChange('E1', e.target.value, 'number')}
            onFocus={() => setFocused('E1')}
            onBlur={() => setFocused(null)}
            min={1}
          />
        </fieldset>

        {/* m */}
        <fieldset className="fieldset w-full sm:w-32 shrink-0">
          <legend className="fieldset-legend text-center">Multiplier (m)</legend>
          <input
            type="number"
            className="input input-bordered w-full text-center"
            value={parameters.m ?? ''}
            onChange={(e) => onChange('m', e.target.value, 'number')}
            onFocus={() => setFocused('m')}
            onBlur={() => setFocused(null)}
            min={1}
            max={10}
          />
        </fieldset>

        {/* E2 */}
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Trustee Endowment (E2)</legend>
          <input
            type="number"
            className="input input-bordered w-full"
            value={parameters.E2 ?? ''}
            onChange={(e) => onChange('E2', e.target.value, 'number')}
            onFocus={() => setFocused('E2')}
            onBlur={() => setFocused(null)}
            min={0}
          />
        </fieldset>
      </div>

      {/* Row 2: Icons + Arrow */}
      <div className="flex items-center gap-2">
        {/* Investor */}
        <div className="flex flex-col items-center gap-1 w-20 sm:w-32 shrink-0">
          <FaUser className={`text-5xl sm:text-7xl transition-colors duration-200 ${investorColor}`} />
          <span className="text-xs text-base-content/50 font-medium tracking-wide uppercase">Investor</span>
        </div>

        {/* Arrow line */}
        <div className="flex-1 flex items-center gap-2">
          <div className={`flex-1 border-t-2 border-dashed transition-colors duration-200 ${lineColor}`} />
          <FaArrowRight className={`text-3xl shrink-0 transition-colors duration-200 ${arrowColor}`} />
          <div className={`flex-1 border-t-2 border-dashed transition-colors duration-200 ${lineColor}`} />
        </div>

        {/* Trustee */}
        <div className="flex flex-col items-center gap-1 w-20 sm:w-32 shrink-0">
          <FaUser className={`text-5xl sm:text-7xl transition-colors duration-200 ${trusteeColor}`} />
          <span className="text-xs text-base-content/50 font-medium tracking-wide uppercase">Trustee</span>
        </div>
      </div>

      {/* Row 3: Step Size */}
      <div className="flex justify-center">
        <fieldset className="fieldset w-full sm:w-40">
          <legend className="fieldset-legend text-center">Step Size (UNIT)</legend>
          <input
            type="number"
            className="input input-bordered w-full text-center"
            value={parameters.UNIT ?? ''}
            onChange={(e) => onChange('UNIT', e.target.value, 'number')}
            onFocus={() => setFocused('UNIT')}
            onBlur={() => setFocused(null)}
            min={1}
          />
        </fieldset>
      </div>
    </div>
  )
}
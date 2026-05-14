import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ds/dropdown-menu'
import { Input } from '@/components/ds/input'
import type { ParameterSchema, ParameterVariation } from '../../types'

interface VariationBuilderProps {
  parameterSchema: ParameterSchema[]
  baseParameters: Record<string, number | string>
  variations: ParameterVariation[]
  onVariationsChange: (variations: ParameterVariation[]) => void
}

export function VariationBuilder({ parameterSchema, baseParameters, variations, onVariationsChange }: VariationBuilderProps) {
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({})

  const availableParams = parameterSchema.filter((param) => !variations.some((v) => v.parameterName === param.name))

  function handleAddParameter(paramName: string) {
    const param = parameterSchema.find((p) => p.name === paramName)
    if (!param) return
    const baseValue = baseParameters[paramName]
    const newVariation: ParameterVariation = {
      parameterName: paramName,
      values: baseValue !== undefined ? [baseValue] : [],
    }
    onVariationsChange([...variations, newVariation])
  }

  function handleRemoveParameter(paramName: string) {
    onVariationsChange(variations.filter((v) => v.parameterName !== paramName))
  }

  function handleAddValue(paramName: string) {
    const inputValue = newValueInputs[paramName]
    if (!inputValue) return
    const param = parameterSchema.find((p) => p.name === paramName)
    if (!param) return
    const parsedValue = param.type === 'number' ? Number(inputValue) : inputValue
    const variation = variations.find((v) => v.parameterName === paramName)
    if (variation?.values.includes(parsedValue)) return
    const updated = variations.map((v) => (v.parameterName === paramName ? { ...v, values: [...v.values, parsedValue] } : v))
    onVariationsChange(updated)
    setNewValueInputs((prev) => ({ ...prev, [paramName]: '' }))
  }

  function handleRemoveValue(paramName: string, value: number | string) {
    const updated = variations.map((v) => (v.parameterName === paramName ? { ...v, values: v.values.filter((val) => val !== value) } : v))
    const filtered = updated.find((v) => v.parameterName === paramName)
    if (filtered && filtered.values.length === 0) {
      onVariationsChange(updated.filter((v) => v.parameterName !== paramName))
    } else {
      onVariationsChange(updated)
    }
  }

  const totalVariations = variations.length > 0 ? variations.reduce((acc, v) => acc * v.values.length, 1) : 0

  function generateCombinations(): Record<string, number | string>[] {
    if (variations.length === 0) return []
    let combinations: Record<string, number | string>[] = [{}]
    for (const variation of variations) {
      const next: Record<string, number | string>[] = []
      for (const combo of combinations) {
        for (const value of variation.values) next.push({ ...combo, [variation.parameterName]: value })
      }
      combinations = next
    }
    return combinations
  }

  const combinations = generateCombinations()

  return (
    <div className="flex flex-col gap-4">
      {variations.map((variation) => {
        const param = parameterSchema.find((p) => p.name === variation.parameterName)
        if (!param) return null
        return (
          <Panel key={variation.parameterName}>
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-sm">{param.label}</span>
              <Btn variant="ghost" size="sm" onClick={() => handleRemoveParameter(variation.parameterName)} className="text-neg">
                Remove
              </Btn>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {variation.values.map((value, idx) => (
                <Chip key={idx} className="gap-1.5">
                  <span className="font-mono">{value}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${value}`}
                    onClick={() => handleRemoveValue(variation.parameterName, value)}
                    className="inline-flex items-center justify-center hover:text-foreground"
                  >
                    <X className="size-2.5" />
                  </button>
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                mono
                type={param.type === 'number' ? 'number' : 'text'}
                placeholder="Add value…"
                value={newValueInputs[variation.parameterName] || ''}
                onChange={(e) => setNewValueInputs((prev) => ({ ...prev, [variation.parameterName]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddValue(variation.parameterName)
                  }
                }}
                min={param.min}
                max={param.max}
              />
              <Btn variant="secondary" size="sm" onClick={() => handleAddValue(variation.parameterName)}>
                <Plus className="size-3.5" /> Add value
              </Btn>
            </div>
          </Panel>
        )
      })}

      {availableParams.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Btn variant="secondary" size="sm">
              <Plus className="size-3.5" /> Add parameter
            </Btn>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {availableParams.map((param) => (
              <DropdownMenuItem key={param.name} onSelect={() => handleAddParameter(param.name)}>
                {param.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {variations.length > 0 && variations.every((v) => v.values.length > 0) && (
        <Panel className="bg-muted">
          <div className="font-semibold text-sm">
            {variations.length > 1 ? `Factorial Design: ${variations.map((v) => v.values.length).join(' × ')} = ` : ''}
            {totalVariations} variation{totalVariations !== 1 ? 's' : ''}
          </div>
          {totalVariations <= 10 && (
            <div className="text-xs text-muted-foreground mt-2 flex flex-col gap-1 font-mono">
              {combinations.map((combo, idx) => (
                <div key={idx}>
                  Variation {idx + 1}: {variations.map((v) => `${v.parameterName}=${combo[v.parameterName]}`).join(', ')}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}

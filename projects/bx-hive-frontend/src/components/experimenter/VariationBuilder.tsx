import { useState } from 'react'
import type { ParameterSchema, ParameterVariation } from '../../types'

interface VariationBuilderProps {
  parameterSchema: ParameterSchema[]
  baseParameters: Record<string, number | string>
  variations: ParameterVariation[]
  onVariationsChange: (variations: ParameterVariation[]) => void
}

export function VariationBuilder({ parameterSchema, baseParameters, variations, onVariationsChange }: VariationBuilderProps) {
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({})

  // Get parameters that haven't been added as variations yet
  const availableParams = parameterSchema.filter((param) => !variations.some((v) => v.parameterName === param.name))

  function handleAddParameter(paramName: string) {
    const param = parameterSchema.find((p) => p.name === paramName)
    if (!param) return

    // Start with the base parameter value as the first variation value
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

    // Don't add duplicate values
    const variation = variations.find((v) => v.parameterName === paramName)
    if (variation?.values.includes(parsedValue)) return

    const updated = variations.map((v) => {
      if (v.parameterName === paramName) {
        return { ...v, values: [...v.values, parsedValue] }
      }
      return v
    })

    onVariationsChange(updated)
    setNewValueInputs((prev) => ({ ...prev, [paramName]: '' }))
  }

  function handleRemoveValue(paramName: string, value: number | string) {
    const updated = variations.map((v) => {
      if (v.parameterName === paramName) {
        return { ...v, values: v.values.filter((val) => val !== value) }
      }
      return v
    })

    // Remove the parameter entirely if no values left
    const filteredVariation = updated.find((v) => v.parameterName === paramName)
    if (filteredVariation && filteredVariation.values.length === 0) {
      onVariationsChange(updated.filter((v) => v.parameterName !== paramName))
    } else {
      onVariationsChange(updated)
    }
  }

  // Calculate total variations (cartesian product)
  const totalVariations = variations.length > 0 ? variations.reduce((acc, v) => acc * v.values.length, 1) : 0

  // Generate preview of all combinations
  function generateCombinations(): Record<string, number | string>[] {
    if (variations.length === 0) return []

    let combinations: Record<string, number | string>[] = [{}]
    for (const variation of variations) {
      const newCombinations: Record<string, number | string>[] = []
      for (const combo of combinations) {
        for (const value of variation.values) {
          newCombinations.push({ ...combo, [variation.parameterName]: value })
        }
      }
      combinations = newCombinations
    }
    return combinations
  }

  const combinations = generateCombinations()

  return (
    <div className="space-y-4">
      {/* Existing variations */}
      {variations.map((variation) => {
        const param = parameterSchema.find((p) => p.name === variation.parameterName)
        if (!param) return null

        return (
          <div key={variation.parameterName} className="border border-base-300 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">{param.label}</span>
              <button className="btn btn-ghost btn-xs text-error" onClick={() => handleRemoveParameter(variation.parameterName)}>
                Remove
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {variation.values.map((value, idx) => (
                <div key={idx} className="badge badge-lg gap-2">
                  {value}
                  <button className="btn btn-ghost btn-xs p-0 min-h-0 h-auto" onClick={() => handleRemoveValue(variation.parameterName, value)}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type={param.type === 'number' ? 'number' : 'text'}
                className="input input-bordered input-sm flex-1"
                placeholder="Add value..."
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
              <button className="btn btn-sm btn-outline" onClick={() => handleAddValue(variation.parameterName)}>
                + Add Value
              </button>
            </div>
          </div>
        )
      })}

      {/* Add parameter dropdown */}
      {availableParams.length > 0 && (
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-outline btn-sm">
            + Add Parameter
          </label>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            {availableParams.map((param) => (
              <li key={param.name}>
                <a onClick={() => handleAddParameter(param.name)}>{param.label}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {variations.length > 0 && variations.every((v) => v.values.length > 0) && (
        <div className="alert alert-info">
          <div>
            <div className="font-semibold">
              {variations.length > 1 ? `Factorial Design: ${variations.map((v) => v.values.length).join(' × ')} = ` : ''}
              {totalVariations} variation{totalVariations !== 1 ? 's' : ''}
            </div>
            {totalVariations <= 10 && (
              <div className="text-sm mt-2 space-y-1">
                {combinations.map((combo, idx) => (
                  <div key={idx}>
                    Variation {idx + 1}:{' '}
                    {variations
                      .map((v) => `${v.parameterName}=${combo[v.parameterName]}`)
                      .join(', ')}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
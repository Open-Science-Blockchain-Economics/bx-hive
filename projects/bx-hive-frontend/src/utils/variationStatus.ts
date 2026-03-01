import { STATUS_CLOSED, STATUS_COMPLETED } from '../hooks/useTrustVariation'
import type { VariationConfig } from '../hooks/useTrustVariation'
import type { VariationInfo } from '../hooks/useTrustExperiments'
import { microAlgoToAlgo } from './amount'

export function statusLabel(config: VariationConfig | undefined): string {
  if (!config) return '\u2014'
  if (config.status === STATUS_COMPLETED) return 'Ended'
  if (config.status === STATUS_CLOSED) return 'Closed'
  return 'Active'
}

export type StatusDotColor = 'info' | 'warning' | 'error' | 'base'

export function statusDotColor(config: VariationConfig | undefined, hasWaiting = false): StatusDotColor {
  if (!config) return 'base'
  if (config.status === STATUS_COMPLETED) return 'error'
  if (config.status === STATUS_CLOSED) return 'warning'
  if (hasWaiting) return 'warning'
  return 'info'
}

export function variationTooltip(v: VariationInfo, config: VariationConfig | undefined): string {
  const status = config ? statusLabel(config) : 'Loading\u2026'
  if (!config) return `${v.label} \u00b7 ${status}`
  const e1 = microAlgoToAlgo(config.e1).toFixed(3)
  const e2 = microAlgoToAlgo(config.e2).toFixed(3)
  const unit = microAlgoToAlgo(config.unit).toFixed(3)
  return `${status} \u00b7 E1: ${e1} \u00b7 E2: ${e2} \u00b7 \u00d7${config.multiplier} \u00b7 unit: ${unit}`
}

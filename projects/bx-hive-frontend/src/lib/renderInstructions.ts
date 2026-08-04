import type { VariationConfig } from '../contracts/TrustVariation'

export type InstructionTokens = Record<string, string>

export function renderInstructions(template: string, tokens: InstructionTokens): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, token: string) => {
    if (token in tokens) return tokens[token]
    // eslint-disable-next-line no-console
    console.warn(`[instructions] unknown token: ${token}`)
    return match
  })
}

export function trustVariationTokens(config: VariationConfig, asset: { decimals: number; unitName: string }): InstructionTokens {
  // An ASA created without a unit name yields '', which would otherwise leave a trailing space inside the template's bold markers.
  const fmt = (amount: bigint) => {
    const whole = formatMicro(amount, asset.decimals)
    return asset.unitName ? `${whole} ${asset.unitName}` : whole
  }
  return {
    e1: fmt(BigInt(config.e1)),
    e2: fmt(BigInt(config.e2)),
    multiplier: String(config.multiplier),
    unit: fmt(BigInt(config.unit)),
  }
}

function formatMicro(micro: bigint, decimals: number): string {
  if (decimals === 0) return micro.toString()
  const base = 10n ** BigInt(decimals)
  const whole = micro / base
  const frac = micro % base
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole.toString()}.${fracStr}`
}

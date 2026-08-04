import { afterEach, describe, expect, it, vi } from 'vitest'

import type { VariationConfig } from '../contracts/TrustVariation'
import { renderInstructions, trustVariationTokens } from './renderInstructions'

const ALGO = { decimals: 6, unitName: 'ALGO' }
const USDC = { decimals: 6, unitName: 'USDC' }
const TICKET = { decimals: 0, unitName: 'TICKET' }
const UNNAMED = { decimals: 6, unitName: '' }

function config(overrides: Partial<VariationConfig> = {}): VariationConfig {
  return {
    e1: 100_000_000n,
    e2: 0n,
    multiplier: 3n,
    unit: 100_000n,
    assetId: 0n,
    status: 1,
    maxParticipants: 0n,
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('trustVariationTokens', () => {
  it('renders ALGO amounts in whole units', () => {
    const tokens = trustVariationTokens(config(), ALGO)
    expect(tokens.e1).toBe('100 ALGO')
  })

  it('renders a non-ALGO asset in whole units, not base units', () => {
    // Regression: an E1 of 100 USDC used to render as "100000000 units".
    const tokens = trustVariationTokens(config({ assetId: 31_566_704n }), USDC)
    expect(tokens.e1).toBe('100 USDC')
    expect(tokens.unit).toBe('0.1 USDC')
  })

  it('renders an indivisible asset without a decimal point', () => {
    const tokens = trustVariationTokens(config({ e1: 5n, assetId: 700n }), TICKET)
    expect(tokens.e1).toBe('5 TICKET')
  })

  it('strips trailing zeros from the fractional part', () => {
    const tokens = trustVariationTokens(config({ e1: 1_500_000n }), ALGO)
    expect(tokens.e1).toBe('1.5 ALGO')
  })

  it('renders the multiplier as a bare number with no unit', () => {
    const tokens = trustVariationTokens(config({ multiplier: 3n }), USDC)
    expect(tokens.multiplier).toBe('3')
  })

  it('renders every monetary token, including a zero endowment', () => {
    const tokens = trustVariationTokens(config({ e2: 0n }), USDC)
    expect(tokens.e2).toBe('0 USDC')
  })

  it('omits the suffix for an asset with no unit name, leaving no trailing space', () => {
    const tokens = trustVariationTokens(config(), UNNAMED)
    expect(tokens.e1).toBe('100')
    expect(tokens.unit).toBe('0.1')
  })
})

describe('renderInstructions', () => {
  it('substitutes known tokens', () => {
    const tokens = trustVariationTokens(config(), USDC)
    expect(renderInstructions('You receive {{e1}} and may send in {{unit}} steps.', tokens)).toBe(
      'You receive 100 USDC and may send in 0.1 USDC steps.',
    )
  })

  it('leaves unknown tokens untouched and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(renderInstructions('Payout is {{bonus}}.', { e1: '100 USDC' })).toBe('Payout is {{bonus}}.')
    expect(warn).toHaveBeenCalledWith('[instructions] unknown token: bonus')
  })

  it('replaces every occurrence of a repeated token', () => {
    expect(renderInstructions('{{e1}} now, {{e1}} later.', { e1: '100 USDC' })).toBe('100 USDC now, 100 USDC later.')
  })

  it('matches tokens with whitespace inside the braces', () => {
    expect(renderInstructions('You hold {{  e1  }}.', { e1: '100 USDC' })).toBe('You hold 100 USDC.')
  })
})

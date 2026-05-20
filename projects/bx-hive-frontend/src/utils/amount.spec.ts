import { describe, expect, it } from 'vitest'

import { baseUnitsToWhole, wholeToBaseUnits } from './amount'

describe('baseUnitsToWhole / wholeToBaseUnits', () => {
  it('round-trips at 6 decimals (ALGO / USDC)', () => {
    const whole = 12.345
    const base = wholeToBaseUnits(whole, 6)
    expect(base).toBe(12_345_000n)
    expect(baseUnitsToWhole(base, 6)).toBe(whole)
  })

  it('round-trips at 0 decimals (indivisible ASA)', () => {
    expect(wholeToBaseUnits(7, 0)).toBe(7n)
    expect(baseUnitsToWhole(7n, 0)).toBe(7)
  })

  it('round-trips at 8 decimals', () => {
    const whole = 1.23456789
    const base = wholeToBaseUnits(whole, 8)
    expect(base).toBe(123_456_789n)
    expect(baseUnitsToWhole(base, 8)).toBeCloseTo(whole, 8)
  })

  it('rounds fractional base units when converting from whole', () => {
    // 0.1 ALGO at 6 decimals would land on 100_000.0000…, but JS float drift
    // could nudge it; the implementation rounds to keep it exact.
    expect(wholeToBaseUnits(0.1, 6)).toBe(100_000n)
  })

  it('handles zero in both directions', () => {
    expect(baseUnitsToWhole(0n, 6)).toBe(0)
    expect(wholeToBaseUnits(0, 6)).toBe(0n)
  })
})

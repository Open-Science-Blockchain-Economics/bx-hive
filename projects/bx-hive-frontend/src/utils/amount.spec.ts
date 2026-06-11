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

  it('preserves precision at the upper bound of the 6-decimal range', () => {
    // 10 trillion ALGO base units (10M whole) is well within Number.MAX_SAFE_INTEGER (2^53 ≈ 9e15).
    expect(baseUnitsToWhole(10_000_000_000_000n, 6)).toBe(10_000_000)
    expect(wholeToBaseUnits(10_000_000, 6)).toBe(10_000_000_000_000n)
  })

  it('loses precision for 18-decimal assets above ~9M whole (documented limitation)', () => {
    // 9M * 1e18 = 9e24, far beyond Number.MAX_SAFE_INTEGER. The result is approximate, not exact —
    // this test pins the current behavior so anyone extending support to 18-decimal assets sees it.
    const huge = 9_000_000n * 10n ** 18n
    const back = baseUnitsToWhole(huge, 18)
    expect(back).toBeCloseTo(9_000_000, 0)
    // Round-trip through wholeToBaseUnits is also lossy at this scale.
    expect(wholeToBaseUnits(back, 18)).not.toBe(huge)
  })

  it('rounds to the nearest base unit when the whole input has float drift', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE-754. The Math.round step inside wholeToBaseUnits
    // collapses that back to the intended 300_000 base units.
    expect(wholeToBaseUnits(0.1 + 0.2, 6)).toBe(300_000n)
  })
})

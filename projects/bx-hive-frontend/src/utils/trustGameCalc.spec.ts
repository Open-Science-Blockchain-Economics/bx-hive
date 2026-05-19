import { describe, expect, it } from 'vitest'

import { computeEscrowWhole, computeMatchMbrAlgo, generateVariationCombinations, toVariationParams } from './trustGameCalc'

describe('generateVariationCombinations', () => {
  it('expands a factorial combination of parameter variations', () => {
    const combos = generateVariationCombinations({ E1: 100, E2: 50, m: 3, UNIT: 10 }, [
      { parameterName: 'm', values: [2, 3] },
      { parameterName: 'E1', values: [80, 100, 120] },
    ])
    expect(combos).toHaveLength(6)
    expect(combos.map((c) => c.m)).toEqual([2, 2, 2, 3, 3, 3])
  })

  it('returns the base params unchanged when no variations are passed', () => {
    const combos = generateVariationCombinations({ E1: 100, m: 3 }, [])
    expect(combos).toEqual([{ E1: 100, m: 3 }])
  })
})

describe('computeEscrowWhole', () => {
  it('computes whole-units escrow as (E1*m + E2) * numPairs (asset-agnostic)', () => {
    // E1=100, E2=50, m=3, maxSubjects=10 → 5 pairs → (100*3 + 50) * 5 = 1750
    expect(computeEscrowWhole({ E1: 100, E2: 50, m: 3 }, 10)).toBe(1750)
  })

  it('rounds participant count down to the nearest pair', () => {
    // maxParticipants=5 → 2 pairs → (100*3 + 50) * 2 = 700
    expect(computeEscrowWhole({ E1: 100, E2: 50, m: 3 }, 5)).toBe(700)
  })

  it('returns 0 when no pairs fit', () => {
    expect(computeEscrowWhole({ E1: 100, E2: 50, m: 3 }, 1)).toBe(0)
  })
})

describe('computeMatchMbrAlgo', () => {
  it('always returns the ALGO-denominated MBR regardless of payout asset', () => {
    // 0.0883 ALGO per pair, 5 pairs from maxSubjects=10
    expect(computeMatchMbrAlgo(10)).toBeCloseTo(0.4415, 6)
  })
})

describe('toVariationParams', () => {
  const base = { E1: 100, E2: 50, m: 3, UNIT: 10 }

  it('defaults to native ALGO (assetId=0n, 6 decimals) when not specified', () => {
    const out = toVariationParams(base, 'baseline', 10, 1750)
    expect(out.assetId).toBe(0n)
    expect(out.e1).toBe(100_000_000n)
    expect(out.e2).toBe(50_000_000n)
    expect(out.unit).toBe(10_000_000n)
    expect(out.escrowBaseUnits).toBe(1_750_000_000n)
  })

  it('threads the supplied assetId and decimals through to base-unit scaling', () => {
    const usdc = 31_566_704n
    const out = toVariationParams(base, 'baseline', 10, 1750, usdc, 6)
    expect(out.assetId).toBe(usdc)
    // USDC has the same 6 decimals as ALGO, so numeric values match the ALGO case.
    expect(out.e1).toBe(100_000_000n)
    expect(out.escrowBaseUnits).toBe(1_750_000_000n)
  })

  it('scales by 10^decimals for non-6-decimal assets', () => {
    // A 3-decimal asset: 100 whole units → 100_000 base units (not 100_000_000).
    const out = toVariationParams(base, 'baseline', 10, 1750, 1234n, 3)
    expect(out.assetId).toBe(1234n)
    expect(out.e1).toBe(100_000n)
    expect(out.e2).toBe(50_000n)
    expect(out.unit).toBe(10_000n)
    expect(out.escrowBaseUnits).toBe(1_750_000n)
  })

  it('passes the multiplier through as a non-scaled bigint', () => {
    const out = toVariationParams(base, 'baseline', 10, 1750)
    expect(out.multiplier).toBe(3n)
  })

  it('honors the maxParticipants and label inputs', () => {
    const out = toVariationParams(base, 'v1', 7, 1000)
    expect(out.label).toBe('v1')
    expect(out.maxParticipants).toBe(7n)
  })
})

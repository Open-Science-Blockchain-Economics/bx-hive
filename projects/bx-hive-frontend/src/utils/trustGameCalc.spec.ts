import { describe, expect, it } from 'vitest'

import {
  computeAlgoRequired,
  computeEscrowWhole,
  computeMatchMbrAlgo,
  generateVariationCombinations,
  toVariationParams,
} from './trustGameCalc'

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

describe('computeAlgoRequired', () => {
  const oneCombo = [{ E1: 100, E2: 50, m: 3 }]

  it('counts escrow when payout asset is ALGO', () => {
    // maxParticipants=10 → 5 pairs → escrow=(100*3+50)*5=1750 ALGO; MBR=5*0.0883
    const out = computeAlgoRequired(oneCombo, 10, true)
    expect(out.totalEscrowWhole).toBe(1750)
    expect(out.totalMatchMbrAlgo).toBeCloseTo(0.4415, 6)
    expect(out.algoRequired).toBeCloseTo(1750.4415, 6)
  })

  it('excludes escrow from the ALGO requirement when payout asset is NOT ALGO', () => {
    // Regression: a 1750-USDC escrow + 0.44-ALGO MBR should only count the MBR
    // toward the wallet's ALGO requirement, not 1750. (Previously this was
    // treated as 1750 ALGO required, breaking the Deploy button for any
    // non-trivial USDC experiment whose wallet had less than the USDC count
    // in ALGO.)
    const out = computeAlgoRequired(oneCombo, 10, false)
    expect(out.totalEscrowWhole).toBe(1750)
    expect(out.totalMatchMbrAlgo).toBeCloseTo(0.4415, 6)
    expect(out.algoRequired).toBeCloseTo(0.4415, 6)
  })

  it('regression: large USDC escrow with a small ALGO wallet does not block submission', () => {
    // Mirrors the reported issue: 3 batch variations, maxParticipants=10
    // (5 pairs/variation), E1=100, E2=0 across m ∈ {3,4,5}. Escrow per
    // variation: 1500 / 2000 / 2500 USDC; total 6000 USDC. MBR per variation:
    // 0.4415 ALGO; total 1.3245 ALGO. (Matches the Funding Summary the user
    // saw with the Deploy button incorrectly disabled.)
    const combos = [
      { E1: 100, E2: 0, m: 3 },
      { E1: 100, E2: 0, m: 4 },
      { E1: 100, E2: 0, m: 5 },
    ]
    const usdc = computeAlgoRequired(combos, 10, false)
    const algo = computeAlgoRequired(combos, 10, true)

    expect(usdc.totalEscrowWhole).toBe(6000)
    expect(usdc.algoRequired).toBeCloseTo(1.3245, 4)
    expect(algo.algoRequired).toBeCloseTo(6001.3245, 4)

    // A typical seeded wallet has ~10 ALGO. The USDC case must NOT be flagged
    // insufficient against that balance; the ALGO case obviously is.
    const walletAlgo = 10
    expect(usdc.algoRequired <= walletAlgo).toBe(true)
    expect(algo.algoRequired <= walletAlgo).toBe(false)
  })

  it('returns zeros for an empty combo list', () => {
    const out = computeAlgoRequired([], 10, true)
    expect(out.totalEscrowWhole).toBe(0)
    expect(out.totalMatchMbrAlgo).toBe(0)
    expect(out.algoRequired).toBe(0)
  })
})

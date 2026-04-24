import { describe, expect, it } from 'vitest'
import { calculateInvestorRefund, calculatePayouts, calculateTrusteeReceived, validateInvestment, validateReturn } from './trustExperiment'

describe('calculateInvestorRefund', () => {
  it('returns endowment minus investment', () => {
    expect(calculateInvestorRefund(100, 30)).toBe(70)
  })

  it('returns full endowment when nothing is invested', () => {
    expect(calculateInvestorRefund(100, 0)).toBe(100)
  })

  it('returns zero when fully invested', () => {
    expect(calculateInvestorRefund(100, 100)).toBe(0)
  })
})

describe('calculateTrusteeReceived', () => {
  it('multiplies investment by multiplier', () => {
    expect(calculateTrusteeReceived(30, 3)).toBe(90)
  })

  it('returns zero when nothing is invested', () => {
    expect(calculateTrusteeReceived(0, 3)).toBe(0)
  })
})

describe('calculatePayouts', () => {
  it('canonical trust-game example (E1=E2=100, m=3, s=30, r=50)', () => {
    expect(calculatePayouts(100, 100, 3, 30, 50)).toEqual({
      investorPayout: 120,
      trusteePayout: 140,
    })
  })

  it('no investment — both keep endowments', () => {
    expect(calculatePayouts(100, 100, 3, 0, 0)).toEqual({
      investorPayout: 100,
      trusteePayout: 100,
    })
  })

  it('trustee returns nothing — investor loses stake, trustee keeps received amount', () => {
    expect(calculatePayouts(100, 100, 3, 30, 0)).toEqual({
      investorPayout: 70,
      trusteePayout: 190,
    })
  })

  it('trustee returns the full received amount — trustee keeps only endowment', () => {
    expect(calculatePayouts(100, 100, 3, 30, 90)).toEqual({
      investorPayout: 160,
      trusteePayout: 100,
    })
  })
})

describe('validateInvestment', () => {
  const E1 = 100
  const UNIT = 10

  it('accepts zero', () => {
    expect(validateInvestment(0, E1, UNIT)).toBe(true)
  })

  it('accepts the full endowment when aligned to UNIT', () => {
    expect(validateInvestment(100, E1, UNIT)).toBe(true)
  })

  it('rejects negative values', () => {
    expect(validateInvestment(-10, E1, UNIT)).toBe(false)
  })

  it('rejects values exceeding the endowment', () => {
    expect(validateInvestment(110, E1, UNIT)).toBe(false)
  })

  it('rejects values not aligned to UNIT', () => {
    expect(validateInvestment(15, E1, UNIT)).toBe(false)
  })
})

describe('validateReturn', () => {
  const received = 90
  const UNIT = 10

  it('accepts zero', () => {
    expect(validateReturn(0, received, UNIT)).toBe(true)
  })

  it('accepts the full received amount when aligned', () => {
    expect(validateReturn(90, received, UNIT)).toBe(true)
  })

  it('rejects negative values', () => {
    expect(validateReturn(-10, received, UNIT)).toBe(false)
  })

  it('rejects values exceeding what was received', () => {
    expect(validateReturn(100, received, UNIT)).toBe(false)
  })

  it('rejects misaligned values', () => {
    expect(validateReturn(15, received, UNIT)).toBe(false)
  })
})

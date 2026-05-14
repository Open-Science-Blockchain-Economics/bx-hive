import { describe, expect, it } from 'vitest'

import { pickVariationRoundRobin, type VariationSlot } from './distributeParticipants'

const s = (appId: bigint, participantCount: number, maxParticipants: number): VariationSlot => ({
  appId,
  participantCount,
  maxParticipants,
})

describe('pickVariationRoundRobin', () => {
  it('returns null when slots is empty', () => {
    expect(pickVariationRoundRobin([])).toBeNull()
  })

  it('returns null when every capped slot is at capacity', () => {
    expect(pickVariationRoundRobin([s(1n, 2, 2), s(2n, 5, 5)])).toBeNull()
  })

  it('treats maxParticipants=0 as unlimited even when participantCount is large', () => {
    expect(pickVariationRoundRobin([s(1n, 1000, 0)])).toBe(1n)
  })

  it('filters out full capped slots and picks from the rest', () => {
    // var 1 is full; var 2 is partial. Var 2 has even count → fewest-participants branch.
    expect(pickVariationRoundRobin([s(1n, 2, 2), s(2n, 4, 10)])).toBe(2n)
  })

  it('prioritises a variation with an odd (incomplete-pair) participant count', () => {
    // var 1 has 0 participants, var 2 has 1 (odd). Picker should pair var 2 first.
    expect(pickVariationRoundRobin([s(1n, 0, 0), s(2n, 1, 0)])).toBe(2n)
  })

  it('among multiple incomplete-pair candidates, picks the one with fewest participants', () => {
    expect(pickVariationRoundRobin([s(1n, 5, 0), s(2n, 1, 0), s(3n, 3, 0)])).toBe(2n)
  })

  it('with all even counts and no caps, picks the variation with fewest participants', () => {
    expect(pickVariationRoundRobin([s(1n, 4, 0), s(2n, 0, 0), s(3n, 2, 0)])).toBe(2n)
  })

  it('does not pick a full slot even when its participantCount is odd', () => {
    // var 1 is full at odd count; var 2 has slots and is even. Var 2 must win.
    expect(pickVariationRoundRobin([s(1n, 3, 3), s(2n, 0, 5)])).toBe(2n)
  })

  it('mixes capped and unlimited correctly: unlimited counts as available regardless of count', () => {
    // var 1 full, var 2 unlimited at 6 participants (even). Unlimited wins by elimination.
    expect(pickVariationRoundRobin([s(1n, 5, 5), s(2n, 6, 0)])).toBe(2n)
  })

  it('breaks ties on fewest-participants branch by taking the first matching slot', () => {
    // two slots tied at 2 participants each. reduce starts at index 0, strictly-less comparison
    // means it stays on slot 1.
    expect(pickVariationRoundRobin([s(1n, 2, 0), s(2n, 2, 0)])).toBe(1n)
  })
})

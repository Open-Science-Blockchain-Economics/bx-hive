export interface VariationSlot {
  appId: bigint
  subjectCount: number
  maxSubjects: number // 0 = unlimited
}

/**
 * Picks the next variation using pair-based round-robin.
 * Completes a pair (2 subjects) in a variation before moving to the next.
 * Returns null if all variations are full.
 */
export function pickVariationRoundRobin(slots: VariationSlot[]): bigint | null {
  const available = slots.filter((s) => s.maxSubjects === 0 || s.subjectCount < s.maxSubjects)
  if (available.length === 0) return null

  // Prioritize variations with an incomplete pair (odd subject count)
  const incomplete = available.filter((s) => s.subjectCount % 2 !== 0)
  if (incomplete.length > 0) {
    return incomplete.reduce((min, s) => (s.subjectCount < min.subjectCount ? s : min), incomplete[0]).appId
  }

  // All pairs complete — pick variation with fewest subjects
  return available.reduce((min, s) => (s.subjectCount < min.subjectCount ? s : min), available[0]).appId
}

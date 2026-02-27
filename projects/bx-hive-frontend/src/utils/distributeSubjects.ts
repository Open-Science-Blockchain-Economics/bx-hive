export interface VariationSlot {
  appId: bigint
  subjectCount: number
  maxSubjects: number // 0 = unlimited
}

/**
 * Picks the variation with the fewest subjects that hasn't hit its capacity cap.
 * Returns null if all variations are full.
 */
export function pickVariationRoundRobin(slots: VariationSlot[]): bigint | null {
  const available = slots.filter((s) => s.maxSubjects === 0 || s.subjectCount < s.maxSubjects)
  if (available.length === 0) return null
  const chosen = available.reduce((min, s) => (s.subjectCount < min.subjectCount ? s : min), available[0])
  return chosen.appId
}
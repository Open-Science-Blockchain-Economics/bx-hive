export interface VariationSlot {
  appId: bigint
  participantCount: number
  maxParticipants: number // 0 = unlimited
}

/**
 * Picks the next variation using pair-based round-robin.
 * Completes a pair (2 participants) in a variation before moving to the next.
 * Returns null if all variations are full.
 */
export function pickVariationRoundRobin(slots: VariationSlot[]): bigint | null {
  const available = slots.filter((s) => s.maxParticipants === 0 || s.participantCount < s.maxParticipants)
  if (available.length === 0) return null

  // Prioritize variations with an incomplete pair (odd participant count)
  const incomplete = available.filter((s) => s.participantCount % 2 !== 0)
  if (incomplete.length > 0) {
    return incomplete.reduce((min, s) => (s.participantCount < min.participantCount ? s : min), incomplete[0]).appId
  }

  // All pairs complete — pick variation with fewest participants
  return available.reduce((min, s) => (s.participantCount < min.participantCount ? s : min), available[0]).appId
}

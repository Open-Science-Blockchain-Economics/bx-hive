// Trust Experiment calculation and validation logic

/**
 * Calculate the refund Investor receives after investing
 * @param E1 - Investor's initial endowment
 * @param s - Amount Investor invested
 * @returns Refund amount (E1 - s)
 */
export function calculateInvestorRefund(E1: number, s: number): number {
  return E1 - s
}

/**
 * Calculate the amount Trustee receives after Investor's investment is multiplied
 * @param s - Amount Investor invested
 * @param m - Multiplier
 * @returns Amount Trustee receives (s × m)
 */
export function calculateTrusteeReceived(s: number, m: number): number {
  return s * m
}

/**
 * Calculate final payouts for both players
 * @param E1 - Investor's initial endowment
 * @param E2 - Trustee's initial endowment
 * @param m - Multiplier
 * @param s - Amount Investor invested
 * @param r - Amount Trustee returned to Investor
 * @returns Object with investorPayout and trusteePayout
 */
export function calculatePayouts(
  E1: number,
  E2: number,
  m: number,
  s: number,
  r: number
): { investorPayout: number; trusteePayout: number } {
  const received = s * m
  const investorPayout = E1 - s + r
  const trusteePayout = E2 + (received - r)

  return { investorPayout, trusteePayout }
}

/**
 * Validate Investor's investment decision
 * @param s - Amount Investor wants to invest
 * @param E1 - Investor's initial endowment
 * @param UNIT - Step size for decisions
 * @returns true if valid, false otherwise
 */
export function validateInvestment(s: number, E1: number, UNIT: number): boolean {
  // Must be non-negative
  if (s < 0) return false

  // Must not exceed endowment
  if (s > E1) return false

  // Must be a multiple of UNIT
  if (s % UNIT !== 0) return false

  return true
}

/**
 * Validate Trustee's return decision
 * @param r - Amount Trustee wants to return
 * @param received - Amount Trustee received (s × m)
 * @param UNIT - Step size for decisions
 * @returns true if valid, false otherwise
 */
export function validateReturn(r: number, received: number, UNIT: number): boolean {
  // Must be non-negative
  if (r < 0) return false

  // Must not exceed received amount
  if (r > received) return false

  // Must be a multiple of UNIT
  if (r % UNIT !== 0) return false

  return true
}
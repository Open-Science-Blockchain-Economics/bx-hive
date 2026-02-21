/**
 * Truncates an Algorand address for display: XXXXXX...XXXX
 */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
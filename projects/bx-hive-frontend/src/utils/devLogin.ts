/** Auto-login URL for a seeded account. Origin-relative so each environment yields its own link. */
export function devLoginUrl(address: string, origin: string = window.location.origin): string {
  return `${origin}/app/dev/login?account=${address}`
}

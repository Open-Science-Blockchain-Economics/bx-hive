// Marketing nav, shared by SiteHeader.astro (desktop) and HeaderControls (mobile panel).
export const NAV_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
] as const

// A post (/blog/a-post) should still mark "Blog" active.
export function isNavActive(href: string, path: string): boolean {
  return path === href || path.startsWith(`${href}/`)
}

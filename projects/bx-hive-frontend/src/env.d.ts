/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string
}

// Runtime-only virtual module from @astrojs/cloudflare; types it for `astro check`.
declare module 'cloudflare:workers' {
  export const env: Record<string, string | undefined>
}

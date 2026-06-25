import path from 'node:path'
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import cloudflare from '@astrojs/cloudflare'
import tailwindcss from '@tailwindcss/vite'

import { instructionsPlugin } from './vite-plugins/instructions'
import { staticDeckPlugin } from './vite-plugins/static-deck'

// `astro dev` with the Cloudflare adapter v13 runs your code inside workerd via
// @cloudflare/vite-plugin, which trips on any CJS dependency that references
// `module` — and use-wallet pulls in CJS Algorand SDKs. Skip the adapter in dev;
// the SSR endpoints (/api/contact, /app/*) are tested via `wrangler dev` against
// the built output instead.
const isBuild = process.argv.includes('build')

// https://astro.build/config
export default defineConfig({
  output: 'static',
  ...(isBuild ? { adapter: cloudflare({ platformProxy: { enabled: true } }) } : {}),
  integrations: [react()],
  vite: {
    // Astro defaults to PUBLIC_; also expose the existing VITE_* app vars.
    envPrefix: ['PUBLIC_', 'VITE_'],
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
    assetsInclude: ['**/*.teal'],
    plugins: [
      // Must precede the SPA fallback so /slides/ rewrites first.
      staticDeckPlugin({ base: '/slides/' }),
      instructionsPlugin({
        contractsDir: path.resolve('../bx-hive-contracts'),
      }),
      tailwindcss(),
    ],
  },
})
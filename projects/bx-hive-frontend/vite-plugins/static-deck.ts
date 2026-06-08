import type { Plugin } from 'vite'

interface StaticDeckPluginOptions {
  /** URL path (with leading + trailing slash) that maps to a prebuilt static SPA in public/, e.g. "/slides/" */
  base: string
}

/**
 * Dev-server fix for serving a prebuilt static SPA that lives in `public/<dir>/`.
 *
 * The bxHive slide deck is built by the sibling `bx-hive-slides` project into
 * `public/slides/`. In production (Nginx `try_files $uri $uri/ ...`, and `vite
 * preview`) a request to `/slides/` resolves to `/slides/index.html` via directory
 * indexing. Vite's dev server does NOT do that directory-index resolution for
 * `public/` subfolders — a bare `/slides/` request falls through to the SPA
 * fallback and boots the React app, which has no such route and error-boundaries.
 *
 * This middleware rewrites `/<dir>` and `/<dir>/` to `/<dir>/index.html` BEFORE
 * Vite's SPA fallback runs, so the static deck loads in dev too. Dev-only; it has
 * no effect on the build.
 */
export function staticDeckPlugin(options: StaticDeckPluginOptions): Plugin {
  const base = options.base.endsWith('/') ? options.base : `${options.base}/`
  const bare = base.slice(0, -1) // "/slides"
  const indexUrl = `${base}index.html`

  return {
    name: 'vite-plugin-static-deck',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        // Match "/slides" or "/slides/" (optionally with a query string), nothing deeper.
        const pathOnly = url.split('?')[0]
        if (pathOnly === bare || pathOnly === base) {
          req.url = indexUrl
        }
        next()
      })
    },
  }
}
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { instructionsPlugin } from './vite-plugins/instructions'
import { staticDeckPlugin } from './vite-plugins/static-deck'

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.teal'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    // Must precede react() so /slides/ rewrites before the SPA fallback runs.
    staticDeckPlugin({ base: '/slides/' }),
    instructionsPlugin({
      contractsDir: path.resolve(__dirname, '../bx-hive-contracts'),
    }),
    tailwindcss(),
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
})

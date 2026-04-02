import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { instructionsPlugin } from './vite-plugins/instructions'

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.teal'],
  plugins: [
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

import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { instructionsPlugin } from './vite-plugins/instructions'

export default defineConfig({
  // The instructions plugin is loaded here too so components importing the
  // virtual instruction module can be rendered under test against the real text.
  plugins: [react(), instructionsPlugin({ contractsDir: path.resolve(__dirname, '../bx-hive-contracts') })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
    passWithNoTests: true,
  },
})

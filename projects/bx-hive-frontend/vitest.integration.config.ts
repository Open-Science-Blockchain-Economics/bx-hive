import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    include: ['tests/integration/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    passWithNoTests: true,
  },
})
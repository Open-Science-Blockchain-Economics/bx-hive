import { defineConfig, devices } from '@playwright/test'

const PORT = 5174
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/globalSetup.ts',
  // Each test deploys + funds + registers KMD accounts and drives the UI; allow generous slack.
  timeout: 120_000,
  // Tests share the same localnet — keep them sequential to avoid contract-state collisions.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Optional: SLOW_MO=500 pnpm test:e2e:headed pauses each action for visibility.
    launchOptions: { slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 0 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Runs on a separate port so it never collides with a manually-started `pnpm dev` on :5173.
    // reuseExistingServer is false so each test run picks up the fresh app IDs
    // globalSetup wrote into .env.e2e.local — a stale dev:e2e server would have stale env.
    //
    // env-mode: dev:e2e launches `vite --mode e2e`, which loads .env (LocalNet @ localhost)
    // and overlays .env.e2e.local (the freshly-deployed app IDs). All algod / indexer / KMD
    // URLs come from .env, so e2e is hard-locked to the runner's localhost localnet.
    command: 'pnpm run dev:e2e',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENV_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env.e2e.local')

export interface DeployedContracts {
  registryAppId: bigint
  trustExperimentsAppId: bigint
}

/**
 * Reads the deployed app IDs that globalSetup wrote into .env.e2e.local.
 * Throws if the file is missing or malformed — typically means the test
 * was launched without going through Playwright's globalSetup.
 */
export function readDeployedContracts(): DeployedContracts {
  let contents: string
  try {
    contents = readFileSync(ENV_FILE, 'utf-8')
  } catch {
    throw new Error(`Missing ${ENV_FILE} — run via \`pnpm test:e2e\` so globalSetup runs first.`)
  }
  const match = (key: string): bigint => {
    const m = contents.match(new RegExp(`^${key}=(\\d+)`, 'm'))
    if (!m) throw new Error(`Missing ${key} in .env.e2e.local`)
    return BigInt(m[1])
  }
  return {
    registryAppId: match('VITE_REGISTRY_APP_ID'),
    trustExperimentsAppId: match('VITE_TRUST_EXPERIMENTS_APP_ID'),
  }
}
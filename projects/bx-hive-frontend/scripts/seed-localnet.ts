/// <reference types="node" />
/**
 * LocalNet seeding script
 * Creates 25 funded accounts in KMD for testing.
 *
 * Usage: pnpm seed:localnet                  (.env — localnet on this machine)
 *        pnpm seed:localnet-dev              (.env.localnet-dev — hosted localnet)
 *        pnpm seed:localnet-prod             (.env.localnet-prod — hosted localnet)
 * Prerequisites: algokit localnet start && python -m smart_contracts deploy
 */

import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ACCOUNT_COUNT = 25
const FUND_AMOUNT_ALGO = 10
const TEST_WALLET_NAME = 'bx-hive-test-accounts'

// Mock USDC asset parameters mirror the real USDC shape (6 decimals).
const USDC_TOTAL = 10_000_000_000_000_000n // 10 billion USDC in base units
const USDC_DECIMALS = 6
const USDC_AIRDROP_BASE_UNITS = 10_000n * 1_000_000n // 10,000 USDC per seeded account
/** `--mode localnet-dev` → `.env.localnet-dev`; no mode → `.env`. Mirrors astro's --mode. */
function resolveEnvFile(): { path: string; mode?: string } {
  const idx = process.argv.indexOf('--mode')
  if (idx === -1) return { path: resolve(__dirname, '../.env') }
  const mode = process.argv[idx + 1]
  if (!mode) {
    console.error('✖ --mode needs a value, e.g. --mode localnet-dev')
    process.exit(1)
  }
  return { path: resolve(__dirname, `../.env.${mode}`), mode }
}

// Both read and written: the minted USDC id must land in the same file the run was configured from.
const { path: ENV_FILE_PATH, mode: ENV_MODE } = resolveEnvFile()

// ---------------------------------------------------------------------------
// Minimal .env loader (avoids needing dotenv as a dependency)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = ENV_FILE_PATH
  try {
    const contents = readFileSync(envPath, 'utf-8')
    for (const line of contents.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, '') // strip surrounding quotes
      if (key && !(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // Falling through leaves the localhost defaults in place — i.e. seeding a different chain
    // than the one asked for. Survivable for a missing `.env`, never for an explicit --mode.
    if (ENV_MODE) {
      console.error(`✖ Could not read ${envPath}`)
      process.exit(1)
    }
    console.warn(`⚠ Could not read ${envPath} — using existing process.env values`)
  }
}

function env(key: string, fallback = ''): string {
  return (process.env[key] ?? fallback).replace(/^["']|["']$/g, '')
}

/**
 * Upsert a single KEY=VALUE entry in the .env file (idempotent). Replaces the
 * existing line in place if KEY already appears, otherwise appends.
 */
function upsertEnvVar(filePath: string, key: string, value: string): void {
  const line = `${key}=${value}`
  let contents = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : ''
  const lineRegex = new RegExp(`^${key}=.*$`, 'm')
  if (lineRegex.test(contents)) {
    contents = contents.replace(lineRegex, line)
  } else {
    if (contents.length > 0 && !contents.endsWith('\n')) contents += '\n'
    contents += line + '\n'
  }
  writeFileSync(filePath, contents, 'utf-8')
}

/**
 * Returns the existing mock USDC asset id if VITE_USDC_ASSET_ID is set and the
 * asset still exists on algod, otherwise mints a new one and writes the id to
 * the .env file.
 */
async function mintOrReuseMockUsdc(algorand: AlgorandClient, dispenserAddr: string): Promise<bigint> {
  const existingRaw = env('VITE_USDC_ASSET_ID', '')
  if (existingRaw) {
    try {
      const existingId = BigInt(existingRaw)
      await algorand.client.algod.assetById(existingId)
      console.log(`  Reusing existing mock USDC asset ${existingId}`)
      return existingId
    } catch {
      console.log(`  VITE_USDC_ASSET_ID="${existingRaw}" could not be reused — creating a new asset`)
    }
  }
  const result = await algorand.send.assetCreate({
    sender: dispenserAddr,
    total: USDC_TOTAL,
    decimals: USDC_DECIMALS,
    assetName: 'USD Coin (mock)',
    unitName: 'USDC',
    defaultFrozen: false,
    manager: dispenserAddr,
    reserve: dispenserAddr,
  })
  const assetId = BigInt(result.assetId)
  upsertEnvVar(ENV_FILE_PATH, 'VITE_USDC_ASSET_ID', assetId.toString())
  console.log(`  Minted mock USDC asset ${assetId} and wrote VITE_USDC_ASSET_ID to ${basename(ENV_FILE_PATH)}`)
  return assetId
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  loadEnv()

  const algodToken = env('VITE_ALGOD_TOKEN')
  const algodServer = env('VITE_ALGOD_SERVER', 'http://localhost')
  const algodPort = Number(env('VITE_ALGOD_PORT', '4001'))
  const kmdToken = env('VITE_KMD_TOKEN')
  const kmdServer = env('VITE_KMD_SERVER', 'http://localhost')
  const kmdPort = Number(env('VITE_KMD_PORT', '4002'))
  const kmdPassword = env('VITE_KMD_PASSWORD', '')

  console.log(`🌱 Seeding LocalNet — creating ${ACCOUNT_COUNT} funded accounts...`)
  console.log(`  Config:    ${basename(ENV_FILE_PATH)}`)
  console.log(`  Algod:     ${algodServer}:${algodPort}`)
  console.log(`  KMD:       ${kmdServer}:${kmdPort}\n`)

  // AlgorandClient with KMD config for dispenser lookup and raw wallet ops
  const algorand = AlgorandClient.fromConfig({
    algodConfig: { server: algodServer, port: algodPort, token: algodToken },
    kmdConfig: { server: kmdServer, port: kmdPort, token: kmdToken },
  })

  // Get the LocalNet dispenser via v10's KmdAccountManager
  const dispenser = await algorand.account.kmd.getLocalNetDispenserAccount()
  algorand.setSignerFromAccount(dispenser)
  console.log(`  Dispenser: ${dispenser.addr.toString()}\n`)

  // Mock USDC ASA: created once and reused on subsequent runs.
  const usdcAssetId = await mintOrReuseMockUsdc(algorand, dispenser.addr.toString())

  // Raw KMD client for wallet/key generation
  const kmd = algorand.client.kmd

  // Create or find the dedicated test wallet
  const { wallets } = await kmd.listWallets()
  const existingWallets = (wallets ?? []) as Array<{ id: string; name: string }>
  let wallet = existingWallets.find((w) => w.name === TEST_WALLET_NAME)
  if (!wallet) {
    console.log(`  Creating KMD wallet "${TEST_WALLET_NAME}"...`)
    const created = await kmd.createWallet({
      walletName: TEST_WALLET_NAME,
      walletPassword: '',
      walletDriverName: 'sqlite',
      masterDerivationKey: new Uint8Array(0),
    })
    wallet = { id: created.wallet.id, name: created.wallet.name }
  } else {
    console.log(`  Using existing KMD wallet "${TEST_WALLET_NAME}"`)
  }

  const { walletHandleToken } = await kmd.initWalletHandle({ walletId: wallet.id, walletPassword: kmdPassword })

  let count = 0
  try {
    for (let i = 1; i <= ACCOUNT_COUNT; i++) {
      // KMD expires a handle ~60s after it was issued. Each account below costs several
      // round trips, so against a remote KMD the loop outlives the handle — renew per account.
      await kmd.renewWalletHandleToken({ walletHandleToken })

      // Create a new account inside the dedicated test wallet
      const { address } = await kmd.generateKey({ walletHandleToken })
      const newAddress = address.toString()

      // Fund from the dispenser
      await algorand.send.payment({
        sender: dispenser.addr,
        receiver: newAddress,
        amount: algo(FUND_AMOUNT_ALGO),
      })

      // Resolve a signer for the newly-generated KMD account so it can sign
      // its own opt-in. setSignerFromAccount registers per-address, so the
      // dispenser's signer (set earlier) remains valid for the airdrop leg.
      const newAccount = await algorand.account.kmd.getWalletAccount(TEST_WALLET_NAME, (a) => a.address.toString() === newAddress)
      if (!newAccount) throw new Error(`Could not resolve signer for ${newAddress}`)
      algorand.setSignerFromAccount(newAccount)
      await algorand.send.assetOptIn({ sender: newAddress, assetId: usdcAssetId })
      await algorand.send.assetTransfer({
        sender: dispenser.addr,
        receiver: newAddress,
        assetId: usdcAssetId,
        amount: USDC_AIRDROP_BASE_UNITS,
      })

      count++
      console.log(`  ✓ Account ${i}: ${newAddress}`)
    }
  } finally {
    // Releasing is best-effort cleanup: if the loop failed because the handle died, releasing it
    // throws too, and an error from `finally` would replace the one that actually explains the run.
    await kmd.releaseWalletHandleToken({ walletHandleToken }).catch(() => {})
  }

  console.log(`\n✅ Done! ${count} accounts created in KMD wallet "${TEST_WALLET_NAME}".`)
  console.log('   Open the home page and refresh to see them.\n')
}

main().catch((err: unknown) => {
  console.error('\n❌ Seeding failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
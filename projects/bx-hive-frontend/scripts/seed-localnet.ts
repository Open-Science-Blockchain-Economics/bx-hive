/// <reference types="node" />
/**
 * LocalNet seeding script
 * Creates 25 funded accounts in KMD for testing.
 *
 * Usage: pnpm seed:localnet
 * Prerequisites: algokit localnet start && python -m smart_contracts deploy
 */

import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
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
const ENV_FILE_PATH = resolve(__dirname, '../.env')

// ---------------------------------------------------------------------------
// Minimal .env loader (avoids needing dotenv as a dependency)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(__dirname, '../.env')
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
    console.warn('⚠ Could not read .env — using existing process.env values')
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
    const existingId = BigInt(existingRaw)
    try {
      await algorand.client.algod.assetById(existingId)
      console.log(`  Reusing existing mock USDC asset ${existingId}`)
      return existingId
    } catch {
      console.log(`  VITE_USDC_ASSET_ID=${existingId} no longer exists on algod — creating a new one`)
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
  console.log(`  Minted mock USDC asset ${assetId} and wrote VITE_USDC_ASSET_ID to .env`)
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

  console.log(`🌱 Seeding LocalNet — creating ${ACCOUNT_COUNT} funded accounts...\n`)

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
    await kmd.releaseWalletHandleToken({ walletHandleToken })
  }

  console.log(`\n✅ Done! ${count} accounts created in KMD wallet "${TEST_WALLET_NAME}".`)
  console.log('   Open the home page and refresh to see them.\n')
}

main().catch((err: unknown) => {
  console.error('\n❌ Seeding failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
/// <reference types="node" />
/**
 * LocalNet seeding script
 * Creates 10 funded accounts in KMD for testing.
 *
 * Usage: pnpm seed:localnet
 * Prerequisites: algokit localnet start && python -m smart_contracts deploy
 */

import algosdk from 'algosdk'
import { AlgorandClient, algos } from '@algorandfoundation/algokit-utils'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ACCOUNT_COUNT = 10
const FUND_AMOUNT_ALGO = 10
const TEST_WALLET_NAME = 'bx-hive-test-accounts'

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

  const registryAppId = BigInt(env('VITE_REGISTRY_APP_ID', '0'))
  const trustExperimentsAppId = BigInt(env('VITE_TRUST_EXPERIMENTS_APP_ID', '0'))

  console.log(`🌱 Seeding LocalNet — creating ${ACCOUNT_COUNT} funded accounts...\n`)

  // AlgorandClient with KMD config for dispenser lookup
  const algorand = AlgorandClient.fromConfig({
    algodConfig: { server: algodServer, port: algodPort, token: algodToken },
    kmdConfig: { server: kmdServer, port: kmdPort, token: kmdToken },
  })

  // Get the LocalNet dispenser (first large-balance account in the KMD wallet)
  const dispenser = await algorand.account.kmd.getLocalNetDispenserAccount()
  algorand.setSignerFromAccount(dispenser)
  console.log(`  Dispenser: ${dispenser.addr.toString()}\n`)

  // Fund contract app accounts so they can cover box MBR for user registrations.
  // After a localnet reset contracts start at 0 balance.
  const appIdsToFund: Array<{ name: string; appId: bigint }> = []
  if (registryAppId > 0n) appIdsToFund.push({ name: 'BxHiveRegistry', appId: registryAppId })
  if (trustExperimentsAppId > 0n) appIdsToFund.push({ name: 'TrustExperiments', appId: trustExperimentsAppId })

  for (const { name, appId } of appIdsToFund) {
    const appAddress = algosdk.getApplicationAddress(appId)
    await algorand.account.ensureFunded(appAddress, dispenser.addr, algos(10))
    console.log(`  ✓ ${name} app account funded: ${appAddress.toString()}`)
  }
  if (appIdsToFund.length > 0) console.log()

  // Raw KMD client to generate new keys in a dedicated test wallet
  const kmd = new algosdk.Kmd(kmdToken, kmdServer, kmdPort)

  // Create or find the dedicated test wallet
  const { wallets } = await kmd.listWallets()
  let wallet = (wallets as Array<{ id: string; name: string }>).find((w) => w.name === TEST_WALLET_NAME)
  if (!wallet) {
    console.log(`  Creating KMD wallet "${TEST_WALLET_NAME}"...`)
    const created = (await kmd.createWallet(TEST_WALLET_NAME, '')) as { wallet: { id: string; name: string } }
    wallet = created.wallet
  } else {
    console.log(`  Using existing KMD wallet "${TEST_WALLET_NAME}"`)
  }

  const { wallet_handle_token: handle } = await kmd.initWalletHandle(wallet.id, kmdPassword)

  let count = 0
  try {
    for (let i = 1; i <= ACCOUNT_COUNT; i++) {
      // Create a new account inside the dedicated test wallet
      const { address } = (await kmd.generateKey(handle)) as { address: string }
      const newAddress = address.toString()

      // Fund from the dispenser
      await algorand.send.payment({
        sender: dispenser.addr,
        receiver: newAddress,
        amount: algos(FUND_AMOUNT_ALGO),
      })

      count++
      console.log(`  ✓ Account ${i}: ${newAddress}`)
    }
  } finally {
    await kmd.releaseWalletHandle(handle)
  }

  console.log(`\n✅ Done! ${count} accounts created in KMD wallet "${TEST_WALLET_NAME}".`)
  console.log('   Open the home page and refresh to see them.\n')
}

main().catch((err: unknown) => {
  console.error('\n❌ Seeding failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
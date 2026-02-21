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
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ACCOUNT_COUNT = 10
const FUND_AMOUNT_ALGO = 10

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
  const kmdWalletName = env('VITE_KMD_WALLET', 'unencrypted-default-wallet')
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
    await algorand.account.ensureFunded(appAddress, dispenser.addr, algos(1))
    console.log(`  ✓ ${name} app account funded: ${appAddress.toString()}`)
  }
  if (appIdsToFund.length > 0) console.log()

  // Raw KMD client to generate new keys in the wallet
  const kmd = new algosdk.Kmd(kmdToken, kmdServer, kmdPort)

  // Find the wallet
  const { wallets } = await kmd.listWallets()
  const wallet = (wallets as Array<{ id: string; name: string }>).find(
    (w) => w.name === kmdWalletName,
  )
  if (!wallet) {
    throw new Error(
      `KMD wallet "${kmdWalletName}" not found.\n` +
        `Is localnet running? Try: algokit localnet start`,
    )
  }

  const { wallet_handle_token: handle } = await kmd.initWalletHandle(wallet.id, kmdPassword)

  const seededAccounts: Array<{ name: string; address: string }> = []

  try {
    for (let i = 1; i <= ACCOUNT_COUNT; i++) {
      // Create a new account inside the KMD wallet (persisted across restarts)
      const { address } = (await kmd.generateKey(handle)) as { address: string }
      const newAddress = address.toString()

      // Fund from the dispenser
      await algorand.send.payment({
        sender: dispenser.addr,
        receiver: newAddress,
        amount: algos(FUND_AMOUNT_ALGO),
      })

      seededAccounts.push({ name: `Account ${i}`, address: newAddress })
      console.log(`  ✓ Account ${i}: ${newAddress}`)
    }
  } finally {
    await kmd.releaseWalletHandle(handle)
  }

  // Write output to public/ so Vite serves it at /localnet-seed.json at runtime
  const publicDir = resolve(__dirname, '../public')
  mkdirSync(publicDir, { recursive: true })
  writeFileSync(resolve(publicDir, 'localnet-seed.json'), JSON.stringify(seededAccounts, null, 2))

  console.log(`\n✅ Done! ${seededAccounts.length} accounts written to public/localnet-seed.json`)
  console.log('   Open the home page and hard-refresh to register them.\n')
}

main().catch((err: unknown) => {
  console.error('\n❌ Seeding failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
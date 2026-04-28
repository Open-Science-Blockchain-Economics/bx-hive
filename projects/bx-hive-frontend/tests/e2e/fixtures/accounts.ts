import { AlgoAmount, type AlgorandClient } from '@algorandfoundation/algokit-utils'
import { TEST_WALLET_NAME } from '../../../src/lib/constants'

export interface KmdAccount {
  /** 58-char Algorand address that exists in the bx-hive-test-accounts KMD wallet. */
  address: string
}

/**
 * Creates a fresh account inside the `bx-hive-test-accounts` KMD wallet (the
 * same wallet the frontend's NetworkProvider is configured to read), funds it
 * from the localnet dispenser, and returns its address. The frontend can then
 * auto-connect to this address via `?e2e-account=<address>` in E2E mode.
 *
 * Mirrors scripts/seed-localnet.ts but produces one account at a time so each
 * Playwright test gets its own clean account.
 */
export async function createKmdAccount(algorand: AlgorandClient, fundAlgo: number): Promise<KmdAccount> {
  const dispenser = await algorand.account.kmd.getLocalNetDispenserAccount()
  algorand.setSignerFromAccount(dispenser)

  const kmd = algorand.client.kmd

  const { wallets } = await kmd.listWallets()
  const existing = ((wallets ?? []) as Array<{ id: string; name: string }>).find((w) => w.name === TEST_WALLET_NAME)
  let walletId: string
  if (existing) {
    walletId = existing.id
  } else {
    const created = await kmd.createWallet({
      walletName: TEST_WALLET_NAME,
      walletPassword: '',
      walletDriverName: 'sqlite',
      masterDerivationKey: new Uint8Array(0),
    })
    walletId = created.wallet.id
  }

  const { walletHandleToken } = await kmd.initWalletHandle({ walletId, walletPassword: '' })
  try {
    const { address } = await kmd.generateKey({ walletHandleToken })
    const newAddress = address.toString()

    await algorand.send.payment({
      sender: dispenser.addr,
      receiver: newAddress,
      amount: AlgoAmount.Algos(fundAlgo),
    })

    // Register a KMD-backed signer so the AlgorandClient can sign txns for
    // this address (otherwise sender-side calls fail with "No signer found").
    const signed = await algorand.account.kmd.getWalletAccount(TEST_WALLET_NAME, (a) => a.address.toString() === newAddress)
    if (!signed) throw new Error(`Could not retrieve signer for newly-created KMD account ${newAddress}`)
    algorand.setSignerFromAccount(signed)

    return { address: newAddress }
  } finally {
    await kmd.releaseWalletHandleToken({ walletHandleToken })
  }
}
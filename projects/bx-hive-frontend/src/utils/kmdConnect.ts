import { WalletId } from '@txnlab/use-wallet'
import type { Wallet } from '@txnlab/use-wallet-react'

import { TEST_WALLET_NAME } from '../lib/constants'

/** Makes `address` the active KMD account, connecting first if needed. */
export async function connectKmdAccount(wallets: Wallet[], address: string): Promise<void> {
  const kmd = wallets.find((w) => w.id === WalletId.KMD)
  if (!kmd) {
    throw new Error('KMD wallet is not configured on this build.')
  }

  // use-wallet restores `accounts` from localStorage without re-querying KMD, so a list cached
  // before a re-seed can omit `address`. connect() re-enumerates and returns the fresh list.
  const accounts = kmd.isConnected && kmd.accounts.some((a) => a.address === address) ? kmd.accounts : await kmd.connect()

  // setActiveAccount only warns on an unknown address and leaves the previous account active —
  // without this check, that means silently acting as the wrong person.
  if (!accounts.some((a) => a.address === address)) {
    throw new Error(`Account is not in the "${TEST_WALLET_NAME}" KMD wallet on this instance.`)
  }

  kmd.setActive() // picks the wallet; setActiveAccount alone leaves any other active wallet in charge
  kmd.setActiveAccount(address)
}

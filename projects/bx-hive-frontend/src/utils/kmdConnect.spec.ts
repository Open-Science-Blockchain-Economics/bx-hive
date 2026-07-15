import { WalletId } from '@txnlab/use-wallet'
import type { Wallet } from '@txnlab/use-wallet-react'
import { describe, expect, it, vi } from 'vitest'

import { connectKmdAccount } from './kmdConnect'

const ALICE = 'ALICE7777777777777777777777777777777777777777777777777777'
const BOB = 'BOB55555555555555555555555555555555555555555555555555555'

function makeKmdWallet({
  isConnected = false,
  accounts = [],
  connectResolvesTo = [],
}: {
  isConnected?: boolean
  accounts?: string[]
  connectResolvesTo?: string[]
} = {}) {
  return {
    id: WalletId.KMD,
    isConnected,
    accounts: accounts.map((address) => ({ name: address, address })),
    connect: vi.fn().mockResolvedValue(connectResolvesTo.map((address) => ({ name: address, address }))),
    setActive: vi.fn(),
    setActiveAccount: vi.fn(),
  } as unknown as Wallet
}

/** Cast is needed because the fakes implement only the surface connectKmdAccount touches. */
const asWallets = (...wallets: unknown[]) => wallets as Wallet[]

describe('connectKmdAccount', () => {
  it('connects and activates an account it finds in KMD', async () => {
    const kmd = makeKmdWallet({ connectResolvesTo: [ALICE, BOB] })

    await connectKmdAccount(asWallets(kmd), BOB)

    expect(kmd.connect).toHaveBeenCalledOnce()
    expect(kmd.setActive).toHaveBeenCalledOnce()
    expect(kmd.setActiveAccount).toHaveBeenCalledWith(BOB)
  })

  it('never activates an account KMD does not hold', async () => {
    // The wrong-identity case: setActiveAccount would no-op and leave the previous account
    // active, so the caller must fail loudly instead.
    const kmd = makeKmdWallet({ connectResolvesTo: [ALICE] })

    await expect(connectKmdAccount(asWallets(kmd), BOB)).rejects.toThrow(/not in the .* KMD wallet/)
    expect(kmd.setActiveAccount).not.toHaveBeenCalled()
    expect(kmd.setActive).not.toHaveBeenCalled()
  })

  it('reconnects when the cached account list is missing the target', async () => {
    // A list persisted before a re-seed: the snapshot lacks BOB, so trusting it would throw
    // even though KMD holds BOB now.
    const kmd = makeKmdWallet({ isConnected: true, accounts: [ALICE], connectResolvesTo: [ALICE, BOB] })

    await connectKmdAccount(asWallets(kmd), BOB)

    expect(kmd.connect).toHaveBeenCalledOnce()
    expect(kmd.setActiveAccount).toHaveBeenCalledWith(BOB)
  })

  it('skips reconnecting when the cached list already has the target', async () => {
    const kmd = makeKmdWallet({ isConnected: true, accounts: [ALICE, BOB] })

    await connectKmdAccount(asWallets(kmd), BOB)

    expect(kmd.connect).not.toHaveBeenCalled()
    expect(kmd.setActiveAccount).toHaveBeenCalledWith(BOB)
  })

  it('throws when KMD is not among the configured wallets', async () => {
    const pera = { id: WalletId.PERA, isConnected: false, accounts: [] }

    await expect(connectKmdAccount(asWallets(pera), ALICE)).rejects.toThrow(/not configured/)
  })
})

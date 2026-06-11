import { useEffect, useRef } from 'react'
import { WalletId } from '@txnlab/use-wallet'
import { useWallet } from '@txnlab/use-wallet-react'

/**
 * In E2E test mode (VITE_E2E_MODE=true), auto-connects the KMD wallet to the
 * account specified by the `e2e-account` URL query parameter. Lets Playwright
 * tests bypass the wallet-connect modal entirely. Renders nothing.
 *
 * The KMD wallet must already be configured in the WalletManager (it is — see
 * NetworkProvider.tsx) and the requested account must exist in the KMD wallet
 * named TEST_WALLET_NAME (seeded via `pnpm seed:localnet`).
 */
export function E2EAutoConnect() {
  const { wallets, isReady } = useWallet()
  // Auto-connect must only fire once per mount. `wallets` is a fresh array
  // reference on every render of useWallet(), and the connect/setActive calls
  // themselves update wallet state, which would re-trigger this effect and
  // loop without a guard.
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (import.meta.env.VITE_E2E_MODE !== 'true') return
    if (!isReady) return
    if (attemptedRef.current) return

    const target = new URLSearchParams(window.location.search).get('e2e-account')
    if (!target) return

    const kmdWallet = wallets.find((w) => w.id === WalletId.KMD)
    if (!kmdWallet) return

    attemptedRef.current = true

    const hasTarget = () => kmdWallet.accounts.some((a) => a.address === target)

    void (async () => {
      try {
        if (!kmdWallet.isConnected) {
          // Fresh connect — KMD's listKeys enumerates ALL accounts, so the
          // target is guaranteed present. No reconnect needed.
          await kmdWallet.connect()
        } else if (!hasTarget()) {
          // Already connected from a persisted list (e.g. a long-lived sandbox
          // watch session). use-wallet:v4 restores that list from localStorage
          // WITHOUT re-querying KMD, so a target from a different run is absent
          // and setActiveAccount would silently fall back to accounts[0].
          // Reconnect to re-enumerate. This branch never runs on the e2e path
          // (fresh context, empty storage → the connect above already ran),
          // so e2e no longer triggers a spurious second connect/disconnect.
          await kmdWallet.connect()
        }
        kmdWallet.setActive()
        kmdWallet.setActiveAccount(target)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[E2EAutoConnect] failed to connect KMD wallet:', err)
      }
    })()
  }, [isReady, wallets])

  return null
}

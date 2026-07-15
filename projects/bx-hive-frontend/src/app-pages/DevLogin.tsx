import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { Btn } from '@/components/ds/button'
import { LoadingSpinner } from '@/components/ui'
import { useActiveUser } from '../hooks/useActiveUser'
import { truncateAddress } from '../utils/address'
import { connectKmdAccount } from '../utils/kmdConnect'

function DevLoginError({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div role="alert" className="rounded-sm border border-neg/35 bg-neg-bg text-neg px-3 py-2.5 text-sm">
        <p className="font-medium">{title}</p>
        {detail && <p className="mt-1 text-xs opacity-90">{detail}</p>}
      </div>
      <Btn variant="secondary" size="sm" className="mt-4" asChild>
        <Link to="/dev/localnet">Back to test accounts</Link>
      </Btn>
    </div>
  )
}

/** Dev-only auto-login: connects the KMD account in `?account=` and lands on its role dashboard. */
export default function DevLogin() {
  const [params] = useSearchParams()
  const target = params.get('account')
  const { wallets, isReady, activeAddress } = useWallet()
  const { activeUser, isFetched } = useActiveUser()
  const [error, setError] = useState<string | null>(null)
  // `wallets` is a fresh array each render and connecting updates it, so this would loop.
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!isReady || !target || attemptedRef.current || activeAddress === target) return
    attemptedRef.current = true
    void connectKmdAccount(wallets, target).catch((err) => setError(err instanceof Error ? err.message : 'Connect failed'))
  }, [isReady, wallets, target, activeAddress])

  if (!target) {
    return <DevLoginError title="Missing ?account= parameter" detail="Copy a login link from the test accounts table." />
  }
  if (error) {
    return <DevLoginError title="Couldn’t sign in" detail={`${truncateAddress(target)} — ${error}`} />
  }

  // Navigate from a render rather than after the await: ProtectedRoute sends you to /join while
  // activeAddress is still null, and it replaces this route, so there's no recovering from it.
  if (activeAddress === target && isFetched) {
    if (!activeUser) {
      return (
        <DevLoginError
          title="That account isn’t registered"
          detail={`${truncateAddress(target)} is in KMD but has no Registry user. Register it from the test accounts table.`}
        />
      )
    }
    // Role comes from the Registry, not the URL — the seeded wallet holds experimenters too, and a
    // role mismatch would bounce to /join with no explanation.
    return <Navigate to={`/dashboard/${activeUser.role}`} replace />
  }

  return (
    <div className="py-16 text-center">
      <LoadingSpinner className="flex justify-center py-4" />
      <p className="text-sm text-muted-foreground">Signing in as {truncateAddress(target)}…</p>
    </div>
  )
}

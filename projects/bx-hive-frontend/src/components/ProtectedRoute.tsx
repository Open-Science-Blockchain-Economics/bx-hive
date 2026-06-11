import { Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import type { UserRole } from '../types'
import { useActiveUser } from '../hooks/useActiveUser'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { activeUser, isLoading, isFetched } = useActiveUser()
  const { activeAddress } = useWallet()

  // A connected wallet whose user lookup hasn't completed yet must wait, not
  // redirect: useActiveUser is `enabled: !!activeAddress`, and a disabled
  // react-query reports isLoading=false, so there's a window where activeAddress
  // is set but the query hasn't run. Redirecting then bounces a freshly-connected
  // wallet off its own route. isFetched stays false until the lookup completes,
  // so an unregistered account still falls through to the branch below.
  if (isLoading || (activeAddress && !isFetched)) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!activeUser) {
    // In E2E/sandbox mode, a connected-but-unregistered account almost always
    // means the frontend is pointed at different contracts than the run that
    // created this account (it reads .env.sandbox.local only at startup). Show a
    // clear message instead of silently bouncing to the landing page.
    if (import.meta.env.VITE_E2E_MODE === 'true' && activeAddress) {
      return <SandboxAccountNotFound address={activeAddress} />
    }
    return <Navigate to="/" replace />
  }

  if (requiredRole && activeUser.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function SandboxAccountNotFound({ address }: { address: string }) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h2 className="text-lg font-semibold">This account isn’t in the current sandbox</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Connected as{' '}
        <code className="font-mono">
          {address.slice(0, 8)}…{address.slice(-4)}
        </code>
        , but it isn’t a registered user in the contracts this app is pointed at.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        This usually means the app loaded older app IDs. Restart the frontend so it picks up the latest run’s contracts, then open the
        experimenter URL that run printed:
      </p>
      <pre className="mt-3 inline-block rounded bg-muted px-3 py-2 text-left text-xs">
        cd projects/bx-hive-frontend{'\n'}pnpm run dev:sandbox
      </pre>
    </div>
  )
}

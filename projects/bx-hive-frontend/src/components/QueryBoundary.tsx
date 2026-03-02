import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { Suspense, type ReactNode } from 'react'
import LoadingSpinner from './ui/LoadingSpinner'

interface RouteErrorFallbackProps {
  error: unknown
  resetErrorBoundary: () => void
}

function getDescriptiveMessage(error: Error): string {
  const msg = error.message.toLowerCase()
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('econnrefused'))
    return 'Could not reach the network. LocalNet may not be running.'
  if (msg.includes('attempt to get default algod'))
    return 'Algod configuration is missing. Check your .env file.'
  return 'Something went wrong while loading this page.'
}

export function RouteErrorFallback({ error, resetErrorBoundary }: RouteErrorFallbackProps) {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  return (
    <div className="flex justify-center py-16 px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="flex justify-center">
          <svg className="w-24 h-28 text-error/30" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="16" cy="28" rx="12" ry="8" transform="rotate(-20 16 28)" fill="currentColor" opacity="0.4" />
            <ellipse cx="48" cy="28" rx="12" ry="8" transform="rotate(20 48 28)" fill="currentColor" opacity="0.4" />
            <ellipse cx="32" cy="44" rx="16" ry="20" fill="currentColor" opacity="0.5" />
            <rect x="18" y="38" width="28" height="4" rx="2" fill="currentColor" />
            <rect x="20" y="48" width="24" height="4" rx="2" fill="currentColor" />
            <rect x="22" y="58" width="20" height="3" rx="1.5" fill="currentColor" />
            <circle cx="32" cy="22" r="11" fill="currentColor" opacity="0.65" />
            <circle cx="27" cy="21" r="2.5" fill="currentColor" />
            <circle cx="37" cy="21" r="2.5" fill="currentColor" />
            <path d="M26 12 Q22 4 18 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M38 12 Q42 4 46 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="18" cy="2" r="2" fill="currentColor" opacity="0.8" />
            <circle cx="46" cy="2" r="2" fill="currentColor" opacity="0.8" />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-base-content">Something went wrong</h2>
          <p className="text-base-content/60 mt-2">{getDescriptiveMessage(errorObj)}</p>
        </div>

        <div className="bg-base-200 border border-base-300 rounded-lg p-4 text-left">
          <p className="text-xs font-mono text-base-content/50 break-all">{errorObj.message}</p>
        </div>

        <button className="btn btn-primary" onClick={resetErrorBoundary}>
          Try Again
        </button>
      </div>
    </div>
  )
}

export default function QueryBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallbackRender={RouteErrorFallback}>
          <Suspense fallback={<LoadingSpinner />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

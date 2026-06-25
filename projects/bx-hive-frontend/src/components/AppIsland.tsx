import '@/lib/buffer-shim'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'

import App from '@/App'
import { NetworkProvider } from '@/providers/NetworkProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

function AppFatalFallback({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  const isEnvError = message.includes('Attempt to get default algod configuration')
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
      <div className="text-center rounded-sm border border-border bg-card p-6 max-w-md">
        <h1 className="font-ui text-2xl font-medium">Fatal Error</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isEnvError ? 'Please set up your .env file based on .env.template.' : 'The application encountered a critical error.'}
        </p>
        <p className="mt-3 text-xs font-mono text-muted-foreground break-all bg-muted p-2 rounded-sm">{message}</p>
      </div>
    </div>
  )
}

export default function AppIsland() {
  return (
    <ErrorBoundary fallbackRender={AppFatalFallback}>
      <ThemeProvider>
        <NetworkProvider>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </NetworkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App'
import '@fontsource-variable/source-serif-4/index.css'
import '@fontsource-variable/source-serif-4/wght-italic.css'
import '@fontsource-variable/inter-tight/index.css'
import '@fontsource-variable/jetbrains-mono/index.css'
import './styles/App.css'
import { NetworkProvider } from './providers/NetworkProvider'

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
    <div className="hero min-h-screen bg-teal-400">
      <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
        <div className="max-w-md">
          <h1 className="text-4xl">Fatal Error</h1>
          <p className="py-4 text-base-content/80">
            {isEnvError ? 'Please set up your .env file based on .env.template.' : 'The application encountered a critical error.'}
          </p>
          <p className="text-xs font-mono text-base-content/50 break-all bg-base-200 p-2 rounded">{message}</p>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary fallbackRender={AppFatalFallback}>
      <NetworkProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </NetworkProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

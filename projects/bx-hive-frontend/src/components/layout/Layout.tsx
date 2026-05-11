import { Outlet, useLocation } from 'react-router-dom'

import { TooltipProvider } from '@/components/ds/tooltip'

import { ActiveUserProvider } from '../../hooks/useActiveUser'
import { ExperimentManagerProvider } from '../../hooks/useExperimentManager'
import Footer from './Footer'
import TopBar from './TopBar'

const FULL_BLEED_PATHS = new Set(['/', '/for-participants'])

export default function Layout() {
  const fullBleed = FULL_BLEED_PATHS.has(useLocation().pathname)
  return (
    <ActiveUserProvider>
      <ExperimentManagerProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <TopBar />
            <main className="flex-1">
              {fullBleed ? (
                <Outlet />
              ) : (
                <div className="max-w-5xl mx-auto p-4">
                  <Outlet />
                </div>
              )}
            </main>
            <Footer />
          </div>
        </TooltipProvider>
      </ExperimentManagerProvider>
    </ActiveUserProvider>
  )
}

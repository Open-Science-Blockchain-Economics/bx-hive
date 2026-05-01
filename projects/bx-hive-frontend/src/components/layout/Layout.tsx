import { Outlet } from 'react-router-dom'

import { TooltipProvider } from '@/components/ds/tooltip'
import { useNewUI } from '@/lib/featureFlags'

import { ActiveUserProvider } from '../../hooks/useActiveUser'
import { ExperimentManagerProvider } from '../../hooks/useExperimentManager'
import Footer from './Footer'
import HeaderBar from './HeaderBar'
import TopBar from './TopBar'

export default function Layout() {
  const newUI = useNewUI()
  return (
    <ActiveUserProvider>
      <ExperimentManagerProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            {newUI ? <TopBar /> : <HeaderBar />}
            <main className="flex-1">
              <div className="max-w-5xl mx-auto p-4">
                <Outlet />
              </div>
            </main>
            <Footer />
          </div>
        </TooltipProvider>
      </ExperimentManagerProvider>
    </ActiveUserProvider>
  )
}

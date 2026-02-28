import { Outlet } from 'react-router-dom'
import HeaderBar from './HeaderBar'
import Footer from './Footer'
import { ActiveUserProvider } from '../../hooks/useActiveUser'
import { ExperimentManagerProvider } from '../../hooks/useExperimentManager'

export default function Layout() {
  return (
    <ActiveUserProvider>
      <ExperimentManagerProvider>
      <div className="min-h-screen flex flex-col">
        <HeaderBar />
        <main className="flex-1">
          <div className="max-w-5xl mx-auto p-4">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </ExperimentManagerProvider>
    </ActiveUserProvider>
  )
}
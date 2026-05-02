import { createBrowserRouter, useRouteError } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import QueryBoundary, { RouteErrorFallback } from './components/QueryBoundary'

function RootErrorElement() {
  const error = useRouteError()
  return <RouteErrorFallback error={error} resetErrorBoundary={() => window.location.reload()} />
}
import BatchDetails from './pages/BatchDetails'
import CreateExperiment from './pages/CreateExperiment'
import DesignSystemShowcase from './pages/DesignSystemShowcase'
import DevLocalnet from './pages/DevLocalnet'
import ExperimentDetails from './pages/ExperimentDetails'
import ExperimenterDashboard from './pages/ExperimenterDashboard'
import Home from './pages/Home'
import PlayExperiment from './pages/PlayExperiment'
import SubjectDashboard from './pages/SubjectDashboard'
import TrustExperimentDetails from './pages/TrustExperimentDetails'

const devRoutes = import.meta.env.DEV
  ? [
      {
        path: '/dev/ds',
        element: <DesignSystemShowcase />,
      },
      {
        path: '/dev/localnet',
        element: <DevLocalnet />,
      },
    ]
  : []

export const router = createBrowserRouter([
  ...devRoutes,
  {
    path: '/',
    element: <Layout />,
    errorElement: <RootErrorElement />,
    children: [
      {
        index: true,
        element: (
          <QueryBoundary>
            <Home />
          </QueryBoundary>
        ),
      },
      {
        path: 'dashboard/experimenter',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <QueryBoundary>
              <ExperimenterDashboard />
            </QueryBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/create',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <QueryBoundary>
              <CreateExperiment />
            </QueryBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/experiment/:experimentId',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <QueryBoundary>
              <ExperimentDetails />
            </QueryBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/batch/:batchId',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <QueryBoundary>
              <BatchDetails />
            </QueryBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard/subject',
        element: (
          <ProtectedRoute requiredRole="subject">
            <QueryBoundary>
              <SubjectDashboard />
            </QueryBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/trust/:expId',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <QueryBoundary>
              <TrustExperimentDetails />
            </QueryBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: 'play/:experimentId',
        element: (
          <ProtectedRoute requiredRole="subject">
            <QueryBoundary>
              <PlayExperiment />
            </QueryBoundary>
          </ProtectedRoute>
        ),
      },
    ],
  },
])

export default router

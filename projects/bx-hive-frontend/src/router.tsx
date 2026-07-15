import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import QueryBoundary, { RouteErrorFallback } from './components/QueryBoundary'
import { useActiveUser } from './hooks/useActiveUser'

function RootErrorElement() {
  const error = useRouteError()
  return <RouteErrorFallback error={error} resetErrorBoundary={() => window.location.reload()} />
}

// Bare /app — send a registered user to their dashboard, otherwise to /join.
function AppIndexRedirect() {
  const { activeUser } = useActiveUser()
  return <Navigate to={activeUser ? `/dashboard/${activeUser.role}` : '/join'} replace />
}
import BatchDetails from './app-pages/BatchDetails'
import CreateExperiment from './app-pages/CreateExperiment'
import DesignSystemShowcase from './app-pages/DesignSystemShowcase'
import DevLocalnet from './app-pages/DevLocalnet'
import DevLogin from './app-pages/DevLogin'
import ExperimentDetails from './app-pages/ExperimentDetails'
import ExperimenterDashboard from './app-pages/ExperimenterDashboard'
import Join from './app-pages/Join'
import PlayExperiment from './app-pages/PlayExperiment'
import ParticipantDashboard from './app-pages/ParticipantDashboard'
import TrustExperimentDetails from './app-pages/TrustExperimentDetails'

const isLocalEnv = import.meta.env.VITE_ENVIRONMENT === 'local'

// /dev/ds stays outside Layout — design system showcase wants a clean canvas.
const devTopLevelRoutes = isLocalEnv
  ? [
      {
        path: '/dev/ds',
        element: <DesignSystemShowcase />,
      },
    ]
  : []

const devLayoutRoutes = isLocalEnv
  ? [
      {
        path: 'dev/localnet',
        element: <DevLocalnet />,
      },
      // No ProtectedRoute — this is the pre-auth surface, and it renders its own errors.
      {
        path: 'dev/login',
        element: <DevLogin />,
      },
    ]
  : []

export const router = createBrowserRouter(
  [
    ...devTopLevelRoutes,
    {
      path: '/',
      element: <Layout />,
      errorElement: <RootErrorElement />,
      children: [
        ...devLayoutRoutes,
        {
          index: true,
          element: <AppIndexRedirect />,
        },
        {
          path: 'join',
          element: (
            <QueryBoundary>
              <Join />
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
          path: 'dashboard/participant',
          element: (
            <ProtectedRoute requiredRole="participant">
              <QueryBoundary>
                <ParticipantDashboard />
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
            <ProtectedRoute requiredRole="participant">
              <QueryBoundary>
                <PlayExperiment />
              </QueryBoundary>
            </ProtectedRoute>
          ),
        },
      ],
    },
  ],
  { basename: '/app' },
)

export default router

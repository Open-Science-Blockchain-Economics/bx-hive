import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import BatchDetails from './pages/BatchDetails'
import ExperimentDetails from './pages/ExperimentDetails'
import ExperimenterDashboard from './pages/ExperimenterDashboard'
import Home from './pages/Home'
import PlayExperiment from './pages/PlayExperiment'
import SubjectDashboard from './pages/SubjectDashboard'
import TrustExperimentDetails from './pages/TrustExperimentDetails'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'dashboard/experimenter',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <ExperimenterDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/experiment/:experimentId',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <ExperimentDetails />
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/batch/:batchId',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <BatchDetails />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard/subject',
        element: (
          <ProtectedRoute requiredRole="subject">
            <SubjectDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/trust/:expId',
        element: (
          <ProtectedRoute requiredRole="experimenter">
            <TrustExperimentDetails />
          </ProtectedRoute>
        ),
      },
      {
        path: 'play/:experimentId',
        element: (
          <ProtectedRoute requiredRole="subject">
            <PlayExperiment />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

export default router

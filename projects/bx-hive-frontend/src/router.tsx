import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import BatchDetails from './pages/BatchDetails'
import ExperimentDetails from './pages/ExperimentDetails'
import ExperimenterDashboard from './pages/ExperimenterDashboard'
import Home from './pages/Home'
import PlayExperiment from './pages/PlayExperiment'
import SubjectDashboard from './pages/SubjectDashboard'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'dashboard/experimenter',
        element: (
          <ProtectedRoute>
            <ExperimenterDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/experiment/:experimentId',
        element: (
          <ProtectedRoute>
            <ExperimentDetails />
          </ProtectedRoute>
        ),
      },
      {
        path: 'experimenter/batch/:batchId',
        element: (
          <ProtectedRoute>
            <BatchDetails />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard/subject',
        element: (
          <ProtectedRoute>
            <SubjectDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'play/:experimentId',
        element: (
          <ProtectedRoute>
            <PlayExperiment />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

export default router

import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import ExperimenterDashboard from './pages/ExperimenterDashboard'
import SubjectDashboard from './pages/SubjectDashboard'
import ProtectedRoute from './components/ProtectedRoute'

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
        path: 'dashboard/subject',
        element: (
          <ProtectedRoute>
            <SubjectDashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

export default router

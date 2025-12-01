import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import ExperimenterDashboard from './pages/ExperimenterDashboard'
import SubjectDashboard from './pages/SubjectDashboard'
import PlayGame from './pages/PlayGame'
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
      {
        path: 'play/:gameId',
        element: (
          <ProtectedRoute>
            <PlayGame />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

export default router

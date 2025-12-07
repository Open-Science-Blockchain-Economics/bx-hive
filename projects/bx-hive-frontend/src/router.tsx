import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ExperimenterDashboard from './pages/ExperimenterDashboard'
import GameDetails from './pages/GameDetails'
import Home from './pages/Home'
import PlayGame from './pages/PlayGame'
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
        path: 'experimenter/game/:gameId',
        element: (
          <ProtectedRoute>
            <GameDetails />
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

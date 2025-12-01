import { Navigate } from 'react-router-dom'
import { useActiveUser } from '../hooks/useActiveUser'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { activeUser, isLoading } = useActiveUser()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!activeUser) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
import { Navigate } from 'react-router-dom'
import type { UserRole } from '../types'
import { useActiveUser } from '../hooks/useActiveUser'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
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

  if (requiredRole && activeUser.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
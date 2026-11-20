import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Result } from 'antd'
import useUserStore from '../../store/user'
import { canManageUsers } from '../../utils/upms'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiresSuperAdmin?: boolean
}

/**
 * ProtectedRoute component
 * Redirects to login page if user is not authenticated
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiresSuperAdmin }) => {
  const session = useUserStore((state) => state.session)
  const location = useLocation()

  if (!session) {
    // Redirect to login page with return url
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }
  if (requiresSuperAdmin && !canManageUsers(session)) {
    return <Result status="403" title="无访问权限" subTitle="用户管理仅对 UPMS 超级管理员开放。" />
  }

  return <>{children}</>
}

export default ProtectedRoute


import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, Result, Spin } from 'antd'
import useUserStore from '../../store/user'
import { isSuperAdmin } from '../../utils/upms'
import { useMenuAccess } from './menuAccess'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiresSuperAdmin?: boolean
  menuPath?: string
}

/**
 * ProtectedRoute component
 * Redirects to login page if user is not authenticated
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiresSuperAdmin, menuPath }) => {
  const session = useUserStore((state) => state.session)
  const location = useLocation()
  const menu = useMenuAccess()

  if (!session) {
    // Redirect to login page with return url
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }
  if (requiresSuperAdmin && !isSuperAdmin(session)) {
    return <Result status="403" title="无访问权限" subTitle="此页面仅对 UPMS 超级管理员开放。" />
  }

  if (menuPath) {
    if (menu.status === 'loading') return <Spin />
    if (menu.status === 'error') {
      return <Result status="error" title="无法加载业务菜单"
        extra={<Button onClick={menu.retry}>重试</Button>} />
    }
    if (!menu.paths.has(menuPath)) {
      return <Result status="403" title="无访问权限" subTitle="请联系管理员检查当前角色的菜单授权。" />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute


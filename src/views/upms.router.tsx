import { ApartmentOutlined, KeyOutlined, SafetyCertificateOutlined, SolutionOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../components/common/LazyRoute'
import type { AdminRouterItem } from '../router'

const RolesPage = lazy(() => import('./roles'))
const DepartmentsPage = lazy(() => import('./departments'))
const PermissionsPage = lazy(() => import('./permissions'))
const AccountSecurityPage = lazy(() => import('./account-security'))

const routes: AdminRouterItem[] = [
  {
    path: 'roles',
    element: <LazyRoute><RolesPage /></LazyRoute>,
    meta: { key: '/roles', label: '角色管理', title: '角色管理', icon: <SolutionOutlined />, order: 1, requiresSuperAdmin: true },
  },
  {
    path: 'departments',
    element: <LazyRoute><DepartmentsPage /></LazyRoute>,
    meta: { key: '/departments', label: '部门管理', title: '部门管理', icon: <ApartmentOutlined />, order: 2, requiresSuperAdmin: true },
  },
  {
    path: 'permissions',
    element: <LazyRoute><PermissionsPage /></LazyRoute>,
    meta: { key: '/permissions', label: '权限管理', title: '权限管理', icon: <KeyOutlined />, order: 3, requiresSuperAdmin: true },
  },
  {
    path: 'account/security',
    element: <LazyRoute><AccountSecurityPage /></LazyRoute>,
    meta: { key: '/account/security', label: '账号安全', title: '账号安全', icon: <SafetyCertificateOutlined />, order: 4 },
  },
]

export default routes

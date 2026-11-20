import { lazy } from 'react'
import { TeamOutlined } from '@ant-design/icons'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const UsersPage = lazy(() => import('.'))

const usersRoutes: AdminRouterItem[] = [
  {
    path: 'users',
    element: <LazyRoute><UsersPage /></LazyRoute>,
    meta: {
      key: '/users',
      label: '用户管理',
      title: '用户管理',
      icon: <TeamOutlined />,
      requiresSuperAdmin: true,
    },
  },
]

export default usersRoutes

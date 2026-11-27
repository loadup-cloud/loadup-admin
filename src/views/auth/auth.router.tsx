import { lazy } from 'react'
import { LoginOutlined } from '@ant-design/icons'
import type { AdminRouterItem } from '../../router'
import LazyRoute from '../../components/common/LazyRoute'

const LoginPage = lazy(() => import('./login'))
const PasswordResetPage = lazy(() => import('./password-reset'))

const authRoutes: AdminRouterItem[] = [
  {
    path: 'auth/password-reset',
    element: <LazyRoute><PasswordResetPage /></LazyRoute>,
  },
  {
    path: 'auth/login',
    element: (
      <LazyRoute>
        <LoginPage />
      </LazyRoute>
    ),
    meta: {
      label: '登录',
      title: '登录',
      key: '/auth/login',
      icon: <LoginOutlined />,
      hideInMenu: true, // Hide in menu
    },
  },
]

export default authRoutes

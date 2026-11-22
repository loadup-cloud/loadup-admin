import { BellOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const NotificationsPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [
  {
    path: 'notifications',
    element: <LazyRoute><NotificationsPage /></LazyRoute>,
    meta: { key: '/notifications', label: '通知管理', title: '通知管理', icon: <BellOutlined />, order: 9 },
  },
]

export default routes

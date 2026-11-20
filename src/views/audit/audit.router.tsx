import { AuditOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const AuditPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [
  {
    path: 'audit',
    element: <LazyRoute><AuditPage /></LazyRoute>,
    meta: { key: '/audit', label: '审计日志', title: '审计日志', icon: <AuditOutlined />, order: 5, requiresSuperAdmin: true },
  },
]

export default routes

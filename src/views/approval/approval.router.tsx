import { AuditOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const ApprovalPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [{
  path: 'approval',
  element: <LazyRoute><ApprovalPage /></LazyRoute>,
  meta: { key: '/approval', label: '审批管理', title: '审批管理', icon: <AuditOutlined />, order: 10 },
}]

export default routes

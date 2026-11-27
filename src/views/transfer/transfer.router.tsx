import { SwapOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const TransferPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [
  {
    path: 'transfer',
    element: <LazyRoute><TransferPage /></LazyRoute>,
    meta: { key: '/transfer', label: '导入导出任务', title: '导入导出任务', icon: <SwapOutlined />, requiresMenuGrant: true, order: 8 },
  },
]

export default routes

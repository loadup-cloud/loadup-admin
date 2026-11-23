import { HomeOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const WorkbenchPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [
  {
    path: 'workbench',
    element: <LazyRoute><WorkbenchPage /></LazyRoute>,
    meta: { key: '/workbench', label: '工作台', title: '工作台', icon: <HomeOutlined />, order: -1 },
  },
]

export default routes

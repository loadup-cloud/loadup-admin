import { BookOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const DictionariesPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [
  {
    path: 'dictionaries',
    element: <LazyRoute><DictionariesPage /></LazyRoute>,
    meta: { key: '/dictionaries', label: '数据字典', title: '数据字典', icon: <BookOutlined />, order: 6, requiresSuperAdmin: true },
  },
]

export default routes

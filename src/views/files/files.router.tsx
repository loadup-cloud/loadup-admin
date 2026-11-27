import { FolderOpenOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const FilesPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [
  {
    path: 'files',
    element: <LazyRoute><FilesPage /></LazyRoute>,
    meta: { key: '/files', label: '文件资源', title: '文件资源', icon: <FolderOpenOutlined />, requiresMenuGrant: true, order: 7 },
  },
]

export default routes

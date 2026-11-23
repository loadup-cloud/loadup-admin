import { LayoutOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const FormDesignPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [{
  path: 'forms/design',
  element: <LazyRoute><FormDesignPage /></LazyRoute>,
  meta: { key: '/forms/design', label: '表单设计', title: '表单设计', icon: <LayoutOutlined />, order: 9 },
}]

export default routes

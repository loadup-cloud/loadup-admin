import { FormOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import LazyRoute from '../../components/common/LazyRoute'
import type { AdminRouterItem } from '../../router'

const DeviceRequestPage = lazy(() => import('.'))

const routes: AdminRouterItem[] = [
  {
    path: 'forms/device-request',
    element: <LazyRoute><DeviceRequestPage /></LazyRoute>,
    meta: {
      key: '/forms/device-request',
      label: '设备领用申请',
      title: '设备领用申请',
      icon: <FormOutlined />,
      requiresMenuGrant: true,
      order: 10,
    },
  },
]

export default routes

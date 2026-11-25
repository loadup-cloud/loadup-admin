import { Alert, Flex, Select, Tabs, Typography } from 'antd'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useUserStore from '../../store/user'
import ApplicationDetail from './ApplicationDetail'
import Templates from './Templates'
import Workbench from './Workbench'

export default function ApprovalPage() {
  const permissions = useUserStore((state) => state.session?.permissions)
  const [search, setSearch] = useSearchParams()
  const [selected, setSelected] = useState(search.get('app') ?? '')
  const [refresh, setRefresh] = useState(0)
  const apps = [...new Set((permissions ?? []).flatMap((permission) => {
    const match = /^approval:([a-z][a-z0-9_.-]{0,63}):(design|start|decide|adjust|read)$/.exec(permission)
    return match ? [match[1]] : []
  }))].sort()
  const app = apps.includes(selected) ? selected : apps[0]
  const linked = app && app === search.get('app') ? search.get('instance') : null
  const linkId = linked && /^[a-f0-9-]{36}$/.test(linked) ? linked : null
  const has = (action: string) => permissions?.includes(`approval:${app}:${action}`) ?? false
  const items = [
    ...(has('design') ? [{ key: 'templates', label: '流程配置', children: <Templates app={app} /> }] : []),
    ...(has('start') ? [{ key: 'start', label: '发起审批', children: <Workbench app={app} mode="start" canRetry={has('retry')} /> }] : []),
    ...(has('decide') ? [{ key: 'mine', label: '我的待办', children: <Workbench app={app} mode="mine" canRetry={has('retry')} /> }] : []),
    ...(has('start') || has('adjust') || has('read') ? [{
      key: 'instances', label: '审批申请', children: <Workbench app={app} mode="instances" canRetry={has('retry')} />,
    }] : []),
  ]

  return (
    <section aria-labelledby="approval-page-title">
      <Flex align="center" justify="space-between" wrap gap="middle" style={{ marginBottom: 12 }}>
        <Typography.Title level={2} id="approval-page-title" style={{ margin: 0 }}>审批管理</Typography.Title>
        {app && <Select aria-label="接入应用" options={apps.map((value) => ({ label: value, value }))}
          value={app} onChange={(value) => {
            setSelected(value)
            setSearch({}, { replace: true })
          }} style={{ minWidth: 180 }} />}
      </Flex>
      {app ? <Tabs key={`${app}:${refresh}`} items={items} destroyOnHidden />
        : <Alert type="info" showIcon title="当前账号没有审批权限" />}
      {linkId && <ApplicationDetail key={linkId} app={app} id={linkId} canRetry={has('retry')}
        close={() => setSearch({}, { replace: true })} onChange={() => setRefresh((value) => value + 1)} />}
    </section>
  )
}

import { AppstoreOutlined, FormOutlined, ProfileOutlined } from '@ant-design/icons'
import { Alert, Card, Flex, Select, Tabs, Typography } from 'antd'
import { useState } from 'react'
import useUserStore from '../../store/user'
import FieldCatalog from './FieldCatalog'
import DefinitionCatalog from './DefinitionCatalog'

export default function FormDesignPage() {
  const permissions = useUserStore((state) => state.session?.permissions)
  const namespaces = [...new Set((permissions ?? []).flatMap((permission) => {
    const match = /^form:([a-z][a-z0-9_]{0,63}):design$/.exec(permission)
    return match ? [match[1].toUpperCase()] : []
  }))].sort()
  const [selected, setSelected] = useState('ASSET')
  const namespace = namespaces.includes(selected) ? selected : namespaces[0]
  const canPublish = Boolean(namespace && permissions?.includes(`form:${namespace.toLowerCase()}:publish`))
  const path = `/forms/${namespace}`

  return (
    <section aria-labelledby="form-design-title">
      <Flex wrap align="center" justify="space-between" gap="middle" style={{ marginBottom: 20 }}>
        <div>
          <Typography.Title level={2} id="form-design-title" style={{ marginTop: 0, marginBottom: 4 }}>表单设计</Typography.Title>
          <Typography.Text type="secondary">定义字段，在字段组中编排控件，再将字段组加入表单模板。</Typography.Text>
        </div>
        {namespace && <Flex align="center" gap="small">
          <Typography.Text id="form-namespace-label">命名空间</Typography.Text>
          <Select aria-labelledby="form-namespace-label" value={namespace} onChange={setSelected}
            options={namespaces.map((value) => ({ label: value, value }))} style={{ minWidth: 144 }} />
        </Flex>}
      </Flex>
      {!namespace ? <Alert type="info" showIcon title="当前账号没有表单设计权限"
        description="请联系管理员为业务命名空间分配设计权限，并重新登录。" />
        : <Card styles={{ body: { paddingTop: 4 } }}>
          <Tabs key={namespace} destroyOnHidden items={[
            { key: 'fields', label: '字段目录', icon: <ProfileOutlined />, children: <FieldCatalog path={path} canPublish={canPublish} /> },
            { key: 'groups', label: '字段组', icon: <AppstoreOutlined />, children: <DefinitionCatalog kind="groups" path={path} canPublish={canPublish} /> },
            { key: 'templates', label: '表单模板', icon: <FormOutlined />, children: <DefinitionCatalog kind="templates" path={path} canPublish={canPublish} /> },
          ]} />
        </Card>}
    </section>
  )
}

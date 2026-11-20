import { App, Button, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Tag, TreeSelect } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import UpmsTreeTable from '../../components/common/UpmsTreeTable'
import { enabledOptions, permissionTypes, treeOptions, type Permission } from '../../utils/upmsModels'
import { upmsErrorText, useUpms, useUpmsData } from '../../utils/useUpms'

type PermissionFields = {
  permissionName: string
  permissionCode: string
  parentId: string
  permissionType: number
  resourcePath: string
  httpMethod: string
  icon: string
  componentPath: string
  sortOrder: number
  visible: boolean
  status: number
  remark: string
}

export default function PermissionsPage() {
  const tree = useUpmsData<Permission[]>('/upms/permission/tree')
  const request = useUpms()
  const { message } = App.useApp()
  const [editing, setEditing] = useState<Permission | null>()
  const records = tree.data ?? []

  async function save(values: PermissionFields) {
    const { permissionCode, ...fields } = values
    if (editing) {
      await request('/upms/permission/update', { ...fields, id: editing.id })
    } else {
      await request('/upms/permission/create', { ...fields, permissionCode })
    }
    tree.reload()
    void message.success('权限已保存')
  }

  async function remove(row: Permission) {
    try {
      await request('/upms/permission/delete', { id: row.id })
      tree.reload()
      void message.success('权限已删除')
    } catch (error) {
      void message.error(upmsErrorText(error))
    }
  }

  const columns: TableColumnsType<Permission> = [
    { title: '权限名称', dataIndex: 'permissionName' },
    { title: '权限编码', dataIndex: 'permissionCode' },
    { title: '类型', dataIndex: 'permissionType', render: (type) => permissionTypes.find(({ value }) => value === type)?.label ?? '—' },
    { title: '资源路径', dataIndex: 'resourcePath', render: (path) => path || '—' },
    { title: '状态', dataIndex: 'status', render: (status) => <Tag color={status === 1 ? 'green' : undefined}>{status === 1 ? '启用' : '停用'}</Tag> },
    {
      title: '操作',
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => setEditing(row)}>编辑</Button>
          <Popconfirm title={`删除权限「${row.permissionName}」？`} onConfirm={() => remove(row)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <UpmsTreeTable
        title="权限管理"
        records={records}
        columns={columns}
        matches={(row, keyword) => [row.permissionName, row.permissionCode].some((value) => value.toLowerCase().includes(keyword))}
        loading={tree.loading}
        error={tree.error}
        onCreate={() => setEditing(null)}
        onReload={tree.reload}
      />
      {editing !== undefined && (
        <UpmsFormDialog<PermissionFields>
          title={editing ? '编辑权限' : '新建权限'}
          initialValues={{
            permissionName: editing?.permissionName,
            permissionCode: editing?.permissionCode,
            permissionType: editing?.permissionType ?? 3,
            parentId: editing?.parentId ?? '0',
            resourcePath: editing?.resourcePath ?? '',
            httpMethod: editing?.httpMethod ?? '',
            icon: editing?.icon ?? '',
            componentPath: editing?.componentPath ?? '',
            sortOrder: editing?.sortOrder ?? 0,
            status: editing?.status ?? 1,
            visible: editing?.visible ?? true,
            remark: editing?.remark ?? '',
          }}
          onSave={save}
          onClose={() => setEditing(undefined)}
        >
          <Form.Item name="permissionName" label="权限名称" rules={[{ required: true, whitespace: true, max: 50 }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="permissionCode" label="权限编码" rules={[{ required: true, pattern: /^[a-z:]{1,100}$/, message: '请输入小写字母或冒号' }]}>
            <Input maxLength={100} disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item name="permissionType" label="权限类型" rules={[{ required: true }]}><Select options={permissionTypes} /></Form.Item>
          <Form.Item name="parentId" label="上级权限">
            <TreeSelect treeData={[{ title: '无上级权限', value: '0' }, ...treeOptions(records, (row) => row.permissionName, editing?.id)]} />
          </Form.Item>
          <Form.Item name="resourcePath" label="资源路径"><Input maxLength={200} /></Form.Item>
          <Form.Item name="httpMethod" label="HTTP 方法"><Input maxLength={10} placeholder="如 POST" /></Form.Item>
          <Form.Item name="componentPath" label="组件路径"><Input maxLength={200} /></Form.Item>
          <Form.Item name="icon" label="图标名称"><Input maxLength={100} /></Form.Item>
          <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}><InputNumber precision={0} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={enabledOptions} /></Form.Item>
          <Form.Item name="visible" label="显示" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea maxLength={500} /></Form.Item>
        </UpmsFormDialog>
      )}
    </>
  )
}

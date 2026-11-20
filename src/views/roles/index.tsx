import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Button, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, TreeSelect, Typography } from 'antd'
import { useCallback, useRef, useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import { toUpmsPage } from '../../utils/upms'
import { enabledOptions, scopeOptions, treeOptions, type Department, type Permission, type Role } from '../../utils/upmsModels'
import { upmsErrorText, useUpms, useUpmsData } from '../../utils/useUpms'
import RoleUsersDialog from './RoleUsersDialog'

type RoleFilter = { roleName?: string; roleCode?: string; status?: number }
type RoleFields = {
  roleName: string
  roleCode: string
  parentId?: string
  dataScope: number
  departmentIds?: string[]
  sortOrder: number
  status: number
  remark: string
}

export default function RolesPage() {
  const request = useUpms()
  const roleTree = useUpmsData<Role[]>('/upms/role/tree')
  const departments = useUpmsData<Department[]>('/upms/department/tree')
  const { message } = App.useApp()
  const table = useRef<ActionType>(undefined)
  const [listError, setListError] = useState('')
  const [editing, setEditing] = useState<Role | null>()
  const [members, setMembers] = useState<Role>()
  const [grant, setGrant] = useState<{ role: Role; permissions: Permission[] }>()
  const [loadingGrant, setLoadingGrant] = useState<string>()

  const loadPage = useCallback(async ({ current = 1, pageSize = 20, roleName, roleCode, status }: RoleFilter & {
    current?: number
    pageSize?: number
  }) => {
    setListError('')
    try {
      return toUpmsPage(await request<Role[]>('/upms/role/list', {
        page: current, size: pageSize, roleName: roleName?.trim() || undefined,
        roleCode: roleCode?.trim() || undefined, status,
      }))
    } catch (error) {
      setListError(upmsErrorText(error))
      return { data: [], total: 0, success: true }
    }
  }, [request])

  async function save(values: RoleFields) {
    const { roleCode, departmentIds, ...fields } = values
    const customDepartments = fields.dataScope === 2 ? departmentIds ?? [] : undefined
    if (editing) {
      await request('/upms/role/update', { ...fields, departmentIds: customDepartments, id: editing.id })
    } else {
      await request('/upms/role/create', { ...fields, departmentIds: customDepartments, roleCode })
    }
    void table.current?.reload()
    roleTree.reload()
    void message.success('角色已保存')
  }

  async function remove(row: Role) {
    try {
      await request('/upms/role/delete', { id: row.id })
      void table.current?.reload(true)
      roleTree.reload()
      void message.success('角色已删除')
    } catch (error) {
      void message.error(upmsErrorText(error))
    }
  }

  async function openGrant(id: string) {
    setLoadingGrant(id)
    try {
      const [role, permissions] = await Promise.all([
        request<Role>('/upms/role/detail', { id }),
        request<Permission[]>('/upms/permission/tree'),
      ])
      if (!role.data || !permissions.data) throw new Error('无法读取角色的权限配置。')
      setGrant({ role: role.data, permissions: permissions.data })
    } catch (error) {
      void message.error(upmsErrorText(error))
    } finally {
      setLoadingGrant(undefined)
    }
  }

  const columns: ProColumns<Role>[] = [
    { title: '角色名称', dataIndex: 'roleName' },
    { title: '角色编码', dataIndex: 'roleCode' },
    { title: '上级角色', dataIndex: 'parentRoleName', search: false },
    {
      title: '数据范围',
      dataIndex: 'dataScope',
      search: false,
      render: (_, row) => scopeOptions.find(({ value }) => value === row.dataScope)?.label ?? '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: enabledOptions },
      render: (_, row) => <Tag color={row.status === 1 ? 'green' : undefined}>{row.status === 1 ? '启用' : '停用'}</Tag>,
    },
    { title: '已分配权限', search: false, render: (_, row) => row.permissions?.length ?? 0 },
    {
      title: '操作',
      search: false,
      render: (_, row) => (
        <Space wrap size={0}>
          <Button type="link" onClick={() => setEditing(row)}>编辑</Button>
          <Button type="link" loading={loadingGrant === row.id} disabled={Boolean(loadingGrant) && loadingGrant !== row.id}
            onClick={() => void openGrant(row.id)}>分配权限</Button>
          <Button type="link" onClick={() => setMembers(row)}>成员</Button>
          <Popconfirm title={`删除角色「${row.roleName}」？`} onConfirm={() => remove(row)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section>
      <Typography.Title level={2}>角色管理</Typography.Title>
      {listError && <Alert type="error" showIcon title={listError} />}
      <ProTable<Role, RoleFilter> rowKey="id" request={loadPage} actionRef={table} columns={columns}
        search={{ defaultCollapsed: false }} options={{ density: false, setting: false }}
        scroll={{ x: 1000 }}
        pagination={{ defaultPageSize: 20, pageSizeOptions: [10, 20, 50, 100], showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`, locale: { items_per_page: '条/页' } }}
        toolBarRender={() => [<Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>新建角色</Button>]}
      />
      {editing !== undefined && (
        <UpmsFormDialog<RoleFields>
          title={editing ? '编辑角色' : '新建角色'}
          initialValues={{
            roleName: editing?.roleName, roleCode: editing?.roleCode, parentId: editing?.parentId ?? undefined,
            dataScope: editing?.dataScope ?? 5, departmentIds: editing?.departmentIds ?? [],
            sortOrder: editing?.sortOrder ?? 0, status: editing?.status ?? 1, remark: editing?.remark ?? '',
          }}
          onSave={save}
          onClose={() => setEditing(undefined)}
        >
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true, whitespace: true, max: 50 }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="roleCode" label="角色编码" rules={[{ required: true, pattern: /^[A-Z_]{1,50}$/, message: '请输入大写字母或下划线' }]}>
            <Input maxLength={50} disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item name="parentId" label="上级角色" extra={roleTree.error || undefined}>
            <TreeSelect allowClear={!editing?.parentId} loading={roleTree.loading}
              treeData={treeOptions(roleTree.data ?? [], (row) => row.roleName, editing?.id)} />
          </Form.Item>
          <Form.Item name="dataScope" label="数据范围" rules={[{ required: true }]}><Select options={scopeOptions} /></Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, next) => previous.dataScope !== next.dataScope}>
            {({ getFieldValue }) => getFieldValue('dataScope') === 2 && (
              <Form.Item name="departmentIds" label="授权部门" extra={departments.error || undefined}>
                <TreeSelect multiple loading={departments.loading}
                  treeData={treeOptions(departments.data ?? [], (row) => row.deptName)} />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}><InputNumber precision={0} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={enabledOptions} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea maxLength={500} /></Form.Item>
        </UpmsFormDialog>
      )}
      {grant && (
        <UpmsFormDialog<{ permissionIds?: string[] }>
          title={`分配权限：${grant.role.roleName}`}
          initialValues={{ permissionIds: grant.role.permissions?.map(({ id }) => id) ?? [] }}
          onClose={() => setGrant(undefined)}
          onSave={async ({ permissionIds }) => {
            await request('/upms/role/update', { id: grant.role.id, permissionIds: permissionIds ?? [] })
            void table.current?.reload()
            void message.success('角色权限已保存')
          }}
        >
          <Form.Item name="permissionIds" label="直接分配的权限">
            <TreeSelect multiple allowClear treeData={treeOptions(grant.permissions, (row) => `${row.permissionName}（${row.permissionCode}）`)} />
          </Form.Item>
        </UpmsFormDialog>
      )}
      {members && <RoleUsersDialog role={members} onClose={() => setMembers(undefined)} />}
    </section>
  )
}

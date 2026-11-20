import { App, Button, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, TreeSelect } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import UpmsTreeTable from '../../components/common/UpmsTreeTable'
import { enabledOptions, treeOptions, type Department } from '../../utils/upmsModels'
import { upmsErrorText, useUpms, useUpmsData } from '../../utils/useUpms'

type DepartmentFields = {
  deptName: string
  deptCode: string
  parentId: string
  mobile: string
  email: string
  sortOrder: number
  status: number
  remark: string
}

export default function DepartmentsPage() {
  const tree = useUpmsData<Department[]>('/upms/department/tree')
  const request = useUpms()
  const { message } = App.useApp()
  const [editing, setEditing] = useState<Department | null>()
  const [moving, setMoving] = useState<Department>()
  const records = tree.data ?? []

  async function save(values: DepartmentFields) {
    const { deptCode, parentId, ...fields } = values
    if (editing) {
      await request('/upms/department/update', { ...fields, id: editing.id })
    } else {
      await request('/upms/department/create', {
        ...fields, deptCode, parentId: parentId === '0' ? null : parentId,
        mobile: fields.mobile || undefined, email: fields.email || undefined,
      })
    }
    tree.reload()
    void message.success('部门已保存')
  }

  async function remove(row: Department) {
    try {
      await request('/upms/department/delete', { id: row.id })
      tree.reload()
      void message.success('部门已删除')
    } catch (error) {
      void message.error(upmsErrorText(error))
    }
  }

  const columns: TableColumnsType<Department> = [
    { title: '部门名称', dataIndex: 'deptName' },
    { title: '部门编码', dataIndex: 'deptCode' },
    { title: '负责人', dataIndex: 'leaderUserName', render: (name) => name || '—' },
    { title: '排序', dataIndex: 'sortOrder' },
    { title: '状态', dataIndex: 'status', render: (status) => <Tag color={status === 1 ? 'green' : undefined}>{status === 1 ? '启用' : '停用'}</Tag> },
    {
      title: '操作',
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => setEditing(row)}>编辑</Button>
          <Button type="link" onClick={() => setMoving(row)}>移动</Button>
          <Popconfirm title={`删除部门「${row.deptName}」？`} onConfirm={() => remove(row)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <UpmsTreeTable
        title="部门管理"
        records={records}
        columns={columns}
        matches={(row, keyword) => [row.deptName, row.deptCode].some((value) => value.toLowerCase().includes(keyword))}
        loading={tree.loading}
        error={tree.error}
        onCreate={() => setEditing(null)}
        onReload={tree.reload}
      />
      {editing !== undefined && (
        <UpmsFormDialog<DepartmentFields>
          title={editing ? '编辑部门' : '新建部门'}
          initialValues={{
            deptName: editing?.deptName,
            deptCode: editing?.deptCode,
            parentId: '0',
            sortOrder: editing?.sortOrder ?? 0,
            status: editing?.status ?? 1,
            mobile: editing?.mobile ?? '',
            email: editing?.email ?? '',
            remark: editing?.remark ?? '',
          }}
          onSave={save}
          onClose={() => setEditing(undefined)}
        >
          <Form.Item name="deptName" label="部门名称" rules={[{ required: true, whitespace: true, max: 50 }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="deptCode" label="部门编码" rules={[{ required: true, pattern: /^[A-Z0-9_]{1,50}$/, message: '请输入大写字母、数字或下划线' }]}>
            <Input maxLength={50} disabled={Boolean(editing)} />
          </Form.Item>
          {!editing && (
            <Form.Item name="parentId" label="上级部门">
              <TreeSelect treeData={[{ title: '无上级部门', value: '0' }, ...treeOptions(records, (row) => row.deptName)]} />
            </Form.Item>
          )}
          <Form.Item name="mobile" label="联系电话" rules={[{ pattern: /^$|^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}>
            <Input maxLength={11} />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email' }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}><InputNumber precision={0} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={enabledOptions} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea maxLength={500} /></Form.Item>
        </UpmsFormDialog>
      )}
      {moving && (
        <UpmsFormDialog<{ newParentId: string }>
          title={`移动部门：${moving.deptName}`}
          initialValues={{ newParentId: moving.parentId ?? '0' }}
          onClose={() => setMoving(undefined)}
          onSave={async ({ newParentId }) => {
            await request('/upms/department/move', { deptId: moving.id, newParentId })
            tree.reload()
            void message.success('部门已移动')
          }}
        >
          <Form.Item name="newParentId" label="新上级部门" rules={[{ required: true }]}>
            <TreeSelect treeData={[{ title: '移至顶级', value: '0' }, ...treeOptions(records, (row) => row.deptName, moving.id)]} />
          </Form.Item>
        </UpmsFormDialog>
      )}
    </>
  )
}

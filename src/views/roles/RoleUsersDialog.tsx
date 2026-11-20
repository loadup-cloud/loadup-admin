import { Alert, App, Button, Input, Modal, Popconfirm, Space, Table } from 'antd'
import { useState } from 'react'
import type { UpmsUser } from '../../utils/upms'
import { toUpmsPage } from '../../utils/upms'
import type { Role } from '../../utils/upmsModels'
import { upmsErrorText, useUpms } from '../../utils/useUpms'

export default function RoleUsersDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const request = useUpms()
  const { message } = App.useApp()
  const [search, setSearch] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [rows, setRows] = useState<UpmsUser[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  async function load(keyword: string) {
    setLoading(true)
    setError('')
    setSubmitted(keyword)
    try {
      const page = toUpmsPage(await request<UpmsUser[]>('/upms/user/list', { page: 1, size: 20, username: keyword }))
      setRows(page.data)
      setTotal(page.total)
    } catch (failure) {
      setRows([])
      setTotal(0)
      setError(upmsErrorText(failure))
    } finally {
      setLoading(false)
    }
  }

  async function changeMembership(userId: string, assigned: boolean) {
    setUpdating(true)
    try {
      await request(assigned ? '/upms/role/remove-from-user' : '/upms/role/assign-to-user', { roleId: role.id, userId })
      void message.success(assigned ? '已移除角色' : '已分配角色')
      await load(submitted)
    } catch (failure) {
      void message.error(upmsErrorText(failure))
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Modal open title={`角色成员：${role.roleName}`} footer={null} width={640} onCancel={onClose}
      closable={!updating} keyboard={!updating} mask={{ closable: !updating }}>
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Input.Search value={search} onChange={(event) => setSearch(event.target.value)} enterButton="查询用户"
          aria-label="按账号、昵称或姓名查询" placeholder="按账号、昵称或姓名查询"
          disabled={loading || updating} onSearch={(value) => { if (value.trim()) void load(value.trim()) }} />
        {error && <Alert type="error" showIcon title={error} />}
        {total > rows.length && <Alert type="info" title="显示前 20 条结果，请缩小搜索范围。" />}
        {submitted && (
          <Table<UpmsUser> size="small" rowKey="id" dataSource={rows} loading={loading} pagination={false} columns={[
            { title: '账号', dataIndex: 'username' },
            { title: '昵称', dataIndex: 'nickname' },
            {
              title: '成员操作',
              key: 'membership',
              render: (_, row) => {
                const assigned = row.roles?.some(({ id }) => id === role.id) ?? false
                const label = assigned ? '移除角色' : '分配角色'
                return (
                  <Popconfirm title={`为 ${row.username} ${label}？`} onConfirm={() => changeMembership(row.id, assigned)}>
                    <Button type="link" danger={assigned} disabled={updating || loading}>{label}</Button>
                  </Popconfirm>
                )
              },
            },
          ]} />
        )}
      </Space>
    </Modal>
  )
}

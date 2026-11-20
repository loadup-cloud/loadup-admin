import { ProTable, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Button, Descriptions, Form, Input, Skeleton, Tag, Typography } from 'antd'
import { useCallback, useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import { toUpmsPage } from '../../utils/upms'
import { upmsErrorText, useUpms, useUpmsData } from '../../utils/useUpms'

type Overview = {
  username: string
  active: boolean
  accountNonLocked: boolean
  loginFailCount?: number | null
  lastLoginAt?: string | null
  lastLoginIp?: string | null
}

type LoginEntry = {
  id: string
  loginAt: string
  ipAddress?: string | null
  success: boolean
  loginType?: string | null
}

type PasswordFields = { oldPassword: string; newPassword: string; confirmPassword: string }

function dateTime(value?: string | null) {
  return value?.replace('T', ' ').slice(0, 19) || '—'
}

const columns: ProColumns<LoginEntry>[] = [
  { title: '登录时间', dataIndex: 'loginAt', render: (_, row) => dateTime(row.loginAt) },
  { title: 'IP 地址', dataIndex: 'ipAddress' },
  { title: '方式', dataIndex: 'loginType' },
  { title: '结果', dataIndex: 'success', render: (_, row) => <Tag color={row.success ? 'green' : 'red'}>{row.success ? '成功' : '失败'}</Tag> },
]

export default function AccountSecurityPage() {
  const overview = useUpmsData<Overview>('/account/security/overview')
  const request = useUpms()
  const { message } = App.useApp()
  const [changingPassword, setChangingPassword] = useState(false)
  const [listError, setListError] = useState('')

  const loadPage = useCallback(async ({ current = 1, pageSize = 20 }: { current?: number; pageSize?: number }) => {
    setListError('')
    try {
      return toUpmsPage(await request<LoginEntry[]>('/account/security/logins', { page: current, size: pageSize }))
    } catch (error) {
      setListError(upmsErrorText(error))
      return { data: [], total: 0, success: true }
    }
  }, [request])

  const info = overview.data
  return (
    <section>
      <Typography.Title level={2}>账号安全</Typography.Title>
      {overview.error && (
        <Alert type="error" showIcon title={overview.error}
          action={<Button size="small" onClick={overview.reload}>重试</Button>} />
      )}
      {overview.loading && !info && <Skeleton active paragraph={{ rows: 2 }} />}
      {info && (
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }} items={[
          { key: 'user', label: '账号', children: info.username },
          { key: 'active', label: '登录状态', children: info.active ? '可登录' : '不可登录' },
          { key: 'lock', label: '账号锁定', children: info.accountNonLocked ? '未锁定' : '已锁定' },
          { key: 'time', label: '最后登录时间', children: dateTime(info.lastLoginAt) },
          { key: 'ip', label: '最后登录 IP', children: info.lastLoginIp || '—' },
          { key: 'attempts', label: '连续登录失败', children: info.loginFailCount ?? '—' },
        ]} />
      )}
      <Button type="primary" style={{ marginBlock: 16 }} onClick={() => setChangingPassword(true)}>修改密码</Button>
      {listError && <Alert type="error" showIcon title={listError} />}
      <ProTable<LoginEntry> rowKey="id" headerTitle="登录记录" columns={columns} request={loadPage}
        search={false} options={{ density: false, setting: false }} scroll={{ x: 620 }}
        pagination={{ defaultPageSize: 20, pageSizeOptions: [10, 20, 50, 100], showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`, locale: { items_per_page: '条/页' } }} />
      {changingPassword && (
        <UpmsFormDialog<PasswordFields>
          title="修改密码"
          onClose={() => setChangingPassword(false)}
          onSave={async (values) => {
            await request('/account/security/password', values)
            void message.success('密码已修改')
          }}
        >
          <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true }, {
            validator: (_, value?: string) => {
              if (value && (Array.from(value).length < 8 || new TextEncoder().encode(value).length > 72)) {
                return Promise.reject(new Error('请输入至少 8 个字符、UTF-8 编码不超过 72 字节的密码。'))
              }
              return Promise.resolve()
            },
          }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认新密码" dependencies={['newPassword']}
            rules={[{ required: true }, ({ getFieldValue }) => ({
              validator: (_, value) => !value || getFieldValue('newPassword') === value
                ? Promise.resolve()
                : Promise.reject(new Error('两次输入的新密码不一致。')),
            })]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </UpmsFormDialog>
      )}
    </section>
  )
}

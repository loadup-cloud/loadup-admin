import { LockOutlined, UnlockOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Badge, Button, Modal, Result, Space, Tag, Typography } from 'antd'
import { useCallback, useRef, useState } from 'react'
import useUserStore from '../../store/user'
import {
  changeAccountLock, listUsers, UpmsError, type AccountAction, type Session, type UpmsUser,
} from '../../utils/upms'

const statusLabels = {
  0: { status: 'default', text: '停用' },
  1: { status: 'success', text: '启用' },
  2: { status: 'error', text: '锁定' },
} as const

const actionLabels = { lock: '锁定', unlock: '解锁' }
type Search = { keyword?: string }
type PendingAction = { action: AccountAction; user: UpmsUser }

function UserTable({ session, onSessionExpired }: {
  session: Session
  onSessionExpired: () => void
}) {
  const table = useRef<ActionType>(undefined)
  const { message } = App.useApp()
  const [loadError, setLoadError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [selection, setSelection] = useState<PendingAction>()
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadPage = useCallback(async ({ current = 1, pageSize = 10, keyword }: Search & {
    current?: number
    pageSize?: number
  }) => {
    setLoadError('')
    try {
      return await listUsers(session, { page: current, size: pageSize, keyword })
    } catch (error) {
      if (error instanceof UpmsError && error.code === 'UNAUTHENTICATED') {
        onSessionExpired()
      } else if (error instanceof UpmsError && error.code === 'ACCESS_DENIED') {
        setForbidden(true)
      } else {
        setLoadError(error instanceof Error ? error.message : '无法加载用户列表。')
      }
      return { data: [], total: 0, success: true }
    }
  }, [session, onSessionExpired])

  function chooseAction(action: AccountAction, user: UpmsUser) {
    setActionError('')
    setSelection({ action, user })
  }

  async function confirmAction() {
    if (!selection || submitting) return
    setSubmitting(true)
    setActionError('')
    const { action, user } = selection
    try {
      await changeAccountLock(session, action, user.id)
      setSelection(undefined)
      void message.success(`已${actionLabels[action]} ${user.username}`)
      void table.current?.reload()
    } catch (error) {
      if (error instanceof UpmsError && error.code === 'UNAUTHENTICATED') {
        onSessionExpired()
      } else {
        setActionError(error instanceof Error ? error.message : '操作失败，请重试。')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (forbidden) {
    return <Result status="403" title="无访问权限" subTitle="UPMS 拒绝了用户列表请求。" />
  }

  const columns: ProColumns<UpmsUser>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '账号、昵称或姓名', allowClear: true, maxLength: 100 },
    },
    {
      title: '用户',
      dataIndex: 'username',
      search: false,
      width: 200,
      render: (_, user) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{user.username}</Typography.Text>
          {user.nickname && user.nickname !== user.username && (
            <Typography.Text type="secondary">{user.nickname}</Typography.Text>
          )}
        </Space>
      ),
    },
    { title: '部门', dataIndex: 'deptName', search: false, width: 130, ellipsis: true },
    {
      title: '角色',
      search: false,
      width: 150,
      render: (_, user) => user.roles?.length
        ? <Space wrap>{user.roles.map((role) => <Tag key={role.id}>{role.roleName || role.roleCode}</Tag>)}</Space>
        : '—',
    },
    {
      title: '联系方式',
      search: false,
      width: 170,
      render: (_, user) => (
        <Space orientation="vertical" size={0}>
          {user.email && <span>{user.email}</span>}
          {user.mobile && <Typography.Text type="secondary">{user.mobile}</Typography.Text>}
          {!user.email && !user.mobile && '—'}
        </Space>
      ),
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      search: false,
      width: 111,
      tooltip: 'UPMS 返回的账号状态。手动锁定和解锁以操作反馈为准。',
      render: (_, user) => {
        const status = statusLabels[user.status as keyof typeof statusLabels]
        return status ? <Badge {...status} /> : '—'
      },
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      search: false,
      width: 157,
      render: (_, user) => user.lastLoginTime?.replace('T', ' ').slice(0, 19) || '—',
    },
    {
      title: '操作',
      search: false,
      width: 174,
      render: (_, user) => (
        <Space size={6}>
          <Button type="link" size="small" aria-label={`锁定 ${user.username}`} icon={<LockOutlined />} onClick={() => chooseAction('lock', user)}>锁定</Button>
          <Button type="link" size="small" aria-label={`解锁 ${user.username}`} icon={<UnlockOutlined />} onClick={() => chooseAction('unlock', user)}>解锁</Button>
        </Space>
      ),
    },
  ]

  return (
    <section aria-labelledby="users-heading">
      <Typography.Title id="users-heading" level={2}>用户管理</Typography.Title>
      {loadError && (
        <Alert
          type="error"
          showIcon
          title={loadError}
          action={<Button size="small" onClick={() => void table.current?.reload()}>重试</Button>}
        />
      )}
      <ProTable<UpmsUser, Search>
        actionRef={table}
        columns={columns}
        request={loadPage}
        rowKey="id"
        search={{ labelWidth: 'auto', span: { xs: 24, sm: 14, md: 14, lg: 12, xl: 10, xxl: 9 }, defaultCollapsed: false }}
        options={{ fullScreen: false, density: false, setting: false, reload: true }}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          locale: { items_per_page: '条/页' },
        }}
        scroll={{ x: 1092 }}
        locale={{ emptyText: '没有符合条件的用户' }}
      />
      <Modal
        title={selection && `${actionLabels[selection.action]}账号`}
        open={Boolean(selection)}
        okText={selection && `确认${actionLabels[selection.action]}`}
        okButtonProps={{ danger: selection?.action === 'lock' }}
        confirmLoading={submitting}
        cancelButtonProps={{ disabled: submitting }}
        closable={!submitting}
        mask={{ closable: false }}
        keyboard={!submitting}
        onOk={() => void confirmAction()}
        onCancel={() => setSelection(undefined)}
        destroyOnHidden
      >
        {selection && (
          <Typography.Paragraph>
            {selection.action === 'lock' ? '锁定后，此账号将无法再次登录。' : '解锁后，此账号可在满足其他登录条件时重新登录。'}
            <br />
            账号 <Typography.Text strong>{selection.user.username}</Typography.Text>
          </Typography.Paragraph>
        )}
        {selection?.action === 'lock' && selection.user.id === session.userId && (
          <Alert type="warning" showIcon title="这是当前登录账号。" />
        )}
        {actionError && <Alert type="error" showIcon title={actionError} />}
      </Modal>
    </section>
  )
}

export default function UsersPage() {
  const session = useUserStore((state) => state.session)
  const logout = useUserStore((state) => state.logout)
  const { message } = App.useApp()

  const onSessionExpired = useCallback(() => {
    logout()
    void message.info('会话已失效，请重新登录。')
  }, [logout, message])

  return session && <UserTable session={session} onSessionExpired={onSessionExpired} />
}

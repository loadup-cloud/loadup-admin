import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Button, Descriptions, Drawer, Popconfirm, Space, Tag, Typography } from 'antd'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useUserStore from '../../store/user'
import { fileDate } from '../../utils/fileResources'
import { isSuperAdmin, toUpmsPage } from '../../utils/upms'
import { upmsErrorText, useUpms, useUpmsData } from '../../utils/useUpms'
import PublishNotificationDialog from './PublishNotificationDialog'
import { isNotificationActionPath } from './notificationAction'

type InboxNotification = {
  id: string
  senderId?: string | null
  category: string
  title: string
  body: string
  actionUrl?: string | null
  readAt?: string | null
  createdAt: string
}

type InboxFilters = { status?: 'all' | 'unread' }
type InboxAction = { kind: 'read' | 'archive'; id: string } | { kind: 'read-all'; id?: never }

function readStatus(read: boolean) {
  return <Tag color={read ? 'default' : 'blue'}>{read ? '已读' : '未读'}</Tag>
}

export default function NotificationsPage() {
  const request = useUpms()
  const canPublish = useUserStore((state) => isSuperAdmin(state.session))
  const { message } = App.useApp()
  const table = useRef<ActionType>(undefined)
  const unread = useUpmsData<{ count: number }>('/notifications/unread-count')
  const [loadError, setLoadError] = useState('')
  const [pending, setPending] = useState<InboxAction>()
  const [detail, setDetail] = useState<{ item: InboxNotification; read: boolean }>()
  const [publishing, setPublishing] = useState(false)

  const loadPage = useCallback(async ({ current = 1, pageSize = 20, status }: InboxFilters & {
    current?: number
    pageSize?: number
  }) => {
    setLoadError('')
    try {
      return toUpmsPage(await request<InboxNotification[]>('/notifications/list', {
        page: current, size: pageSize, unreadOnly: status === 'unread',
      }))
    } catch (failure) {
      setLoadError(upmsErrorText(failure))
      return { data: [], total: 0, success: true }
    }
  }, [request])

  function reloadInbox(firstPage = false) {
    void table.current?.reload(firstPage)
    unread.reload()
  }

  async function updateInbox(action: InboxAction) {
    if (pending) return
    setPending(action)
    try {
      const { data } = await request<{ updated: number }>(`/notifications/${action.kind}`, action.id ? { id: action.id } : {})
      setDetail((current) => {
        if (!current || (action.id && current.item.id !== action.id)) return current
        return action.kind === 'archive' ? undefined : { ...current, read: true }
      })
      reloadInbox(true)
      if (action.kind === 'read-all') {
        void message.success(data ? `已将 ${data.updated} 条通知标记为已读` : '已全部标记为已读')
      } else {
        void message.success(action.kind === 'archive' ? '通知已归档' : '已标记为已读')
      }
    } catch (failure) {
      void message.error(upmsErrorText(failure))
    } finally {
      setPending(undefined)
    }
  }

  function isPending(kind: InboxAction['kind'], id?: string) {
    return pending?.kind === kind && pending.id === id
  }

  function renderArchive(id: string, inTable = false) {
    const archiving = isPending('archive', id)
    return (
      <Popconfirm title="归档这条通知？" description="归档后会从通知列表移除。" okText="确认归档"
        onConfirm={() => updateInbox({ kind: 'archive', id })}>
        <Button type={inTable ? 'link' : 'default'} size={inTable ? 'small' : 'middle'} loading={archiving}
          disabled={Boolean(pending) && !archiving}>归档</Button>
      </Popconfirm>
    )
  }

  function renderRead(id: string, inTable = false) {
    const marking = isPending('read', id)
    return (
      <Button type={inTable ? 'link' : 'primary'} size={inTable ? 'small' : 'middle'} loading={marking}
        disabled={Boolean(pending) && !marking} onClick={() => void updateInbox({ kind: 'read', id })}>标记已读</Button>
    )
  }

  const columns: ProColumns<InboxNotification>[] = [
    {
      title: '读取状态', dataIndex: 'status', hideInTable: true, valueType: 'select', initialValue: 'all',
      valueEnum: { all: '全部', unread: '仅未读' }, fieldProps: { allowClear: false },
    },
    { title: '标题', dataIndex: 'title', search: false, ellipsis: true },
    { title: '类别', dataIndex: 'category', search: false, width: 140, ellipsis: true },
    { title: '状态', key: 'read', search: false, width: 84, render: (_, row) => readStatus(Boolean(row.readAt)) },
    { title: '接收时间', dataIndex: 'createdAt', search: false, width: 164, render: (_, row) => fileDate(row.createdAt) },
    {
      title: '操作', key: 'actions', search: false, width: 240,
      render: (_, row) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => setDetail({ item: row, read: Boolean(row.readAt) })}>
            查看详情
          </Button>
          {!row.readAt && renderRead(row.id, true)}
          {renderArchive(row.id, true)}
        </Space>
      ),
    },
  ]

  return (
    <section aria-labelledby="notifications-heading">
      <Typography.Title id="notifications-heading" level={2}>通知管理</Typography.Title>
      {loadError && <Alert type="error" showIcon title={loadError}
        action={<Button size="small" onClick={() => reloadInbox()}>重试</Button>} />}
      <ProTable<InboxNotification, InboxFilters>
        rowKey="id" actionRef={table} request={loadPage} columns={columns}
        search={{ defaultCollapsed: false, labelWidth: 'auto' }}
        options={{ density: false, setting: false, reload: () => reloadInbox() }}
        scroll={{ x: 780 }} locale={{ emptyText: '没有符合条件的通知' }}
        headerTitle={(
          <Space size="small">
            <Typography.Text role="status">
              {unread.loading ? '正在读取未读数…' : unread.error || !unread.data ? '未读数暂不可用' : `未读 ${unread.data.count} 条`}
            </Typography.Text>
            {unread.error && <Button type="link" size="small" onClick={unread.reload}>重试未读数</Button>}
          </Space>
        )}
        pagination={{ defaultPageSize: 20, pageSizeOptions: [10, 20, 50, 100], showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`, locale: { items_per_page: '条/页' } }}
        toolBarRender={() => [
          <Popconfirm key="read-all" title="将当前账号的所有未读通知标记为已读？" okText="确认全部已读"
            onConfirm={() => updateInbox({ kind: 'read-all' })}>
            <Button loading={isPending('read-all')}
              disabled={unread.loading || (!unread.error && unread.data?.count === 0) || (Boolean(pending) && !isPending('read-all'))}>
              全部标记已读
            </Button>
          </Popconfirm>,
          canPublish && <Button key="publish" type="primary" onClick={() => setPublishing(true)}>发布通知</Button>,
        ]}
      />
      {canPublish && publishing && <PublishNotificationDialog onClose={() => setPublishing(false)}
        onPublished={() => reloadInbox(true)} />}
      <Drawer title="通知详情" size="large" open={Boolean(detail)} onClose={() => setDetail(undefined)}
        extra={detail && (
          <Space>
            {renderArchive(detail.item.id)}
            {!detail.read && renderRead(detail.item.id)}
          </Space>
        )}>
        {detail && (
          <>
            <Typography.Title level={4} style={{ overflowWrap: 'anywhere' }}>{detail.item.title}</Typography.Title>
            <Descriptions bordered size="small" column={1} items={[
              { key: 'category', label: '类别', children: detail.item.category },
              { key: 'status', label: '状态', children: readStatus(detail.read) },
              { key: 'sender', label: '发送人 ID', children: detail.item.senderId || '—' },
              { key: 'time', label: '接收时间', children: fileDate(detail.item.createdAt) },
              ...(detail.item.readAt ? [{ key: 'readAt', label: '已读时间', children: fileDate(detail.item.readAt) }] : []),
              ...(detail.item.actionUrl ? [{ key: 'action', label: '跳转地址', children: (
                <Typography.Text copyable={{ text: detail.item.actionUrl }} style={{ overflowWrap: 'anywhere' }}>
                  {isNotificationActionPath(detail.item.actionUrl)
                    ? <Link to={detail.item.actionUrl}>{detail.item.actionUrl}</Link> : detail.item.actionUrl}
                </Typography.Text>
              ) }] : []),
            ]} />
            <Typography.Title level={5} style={{ marginTop: 24 }}>通知正文</Typography.Title>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail.item.body}</Typography.Paragraph>
          </>
        )}
      </Drawer>
    </section>
  )
}

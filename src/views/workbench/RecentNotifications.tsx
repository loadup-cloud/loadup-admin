import { Alert, App, Button, Card, Empty, Flex, Popconfirm, Skeleton, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import NotificationDetails from '../../components/notifications/NotificationDetails'
import { useNotificationUnread } from '../../components/notifications/notificationUnreadContext'
import { fileDate } from '../../utils/fileResources'
import type { InboxNotification } from '../../utils/notifications'
import { upmsErrorText, useUpms, useUpmsData } from '../../utils/useUpms'

const recentQuery = { page: 1, size: 5 }
type ReadAction = { id: string } | 'all'

export default function RecentNotifications() {
  const recent = useUpmsData<InboxNotification[]>('/inbox/list', recentQuery)
  const unread = useNotificationUnread()
  const request = useUpms()
  const { message } = App.useApp()
  const [selected, setSelected] = useState<{ item: InboxNotification; read: boolean }>()
  const [pending, setPending] = useState<ReadAction>()

  function refresh() {
    recent.reload()
    unread.reload()
  }

  async function markRead(action: ReadAction) {
    if (pending) return
    setPending(action)
    try {
      if (action === 'all') {
        await request('/inbox/read-all')
      } else {
        await request('/inbox/read', { id: action.id })
      }
      setSelected((current) => {
        if (!current || (action !== 'all' && current.item.id !== action.id)) return current
        return { ...current, read: true }
      })
      refresh()
      void message.success(action === 'all' ? '已全部标记为已读' : '已标记为已读')
    } catch (failure) {
      void message.error(upmsErrorText(failure))
    } finally {
      setPending(undefined)
    }
  }

  function renderMarkRead(id: string) {
    const marking = pending !== 'all' && pending?.id === id
    return (
      <Button size="small" loading={marking} disabled={Boolean(pending) && !marking}
        onClick={() => void markRead({ id })}>标记已读</Button>
    )
  }

  const unreadLabel = unread.loading ? '正在读取未读数…'
    : unread.error || !unread.data ? '未读数暂不可用' : `未读 ${unread.data.count} 条`
  const items = recent.data ?? []

  return (
    <Card title="最近通知" extra={<Link to="/notifications">全部通知</Link>}>
      <Flex gap="small" align="center" justify="space-between" wrap="wrap">
        <Typography.Text role="status">{unreadLabel}</Typography.Text>
        <Space wrap>
          <Button size="small" loading={recent.loading} disabled={Boolean(pending)} onClick={refresh}>刷新</Button>
          <Popconfirm title="将当前账号的所有未读通知标记为已读？" okText="确认全部已读"
            onConfirm={() => markRead('all')}>
            <Button size="small" loading={pending === 'all'}
              disabled={unread.loading || unread.data?.count === 0 || (Boolean(pending) && pending !== 'all')}>
              全部标记已读
            </Button>
          </Popconfirm>
        </Space>
      </Flex>
      {recent.error ? <Alert type="error" showIcon title={recent.error} style={{ marginTop: 12 }} />
        : items.length > 0 ? (
          <Flex component="ul" role="list" vertical gap="middle" style={{ padding: 0, marginBottom: 0 }}>
            {items.map((item) => (
              <Flex component="li" key={item.id} align="center" justify="space-between" gap="small" wrap="wrap">
                <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <Button type="link" size="small" style={{ maxWidth: '100%', paddingInline: 0 }}
                    onClick={() => setSelected({ item, read: Boolean(item.readAt) })}>
                    <Typography.Text ellipsis={{ tooltip: item.title }} style={{ color: 'inherit' }}>{item.title}</Typography.Text>
                  </Button>
                  <div>
                    <Tag color={item.readAt ? 'default' : 'blue'}>{item.readAt ? '已读' : '未读'}</Tag>
                    <Typography.Text type="secondary">{fileDate(item.createdAt)}</Typography.Text>
                  </div>
                </div>
                {!item.readAt && renderMarkRead(item.id)}
              </Flex>
            ))}
          </Flex>
        ) : recent.loading ? <Skeleton active /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />}
      <NotificationDetails item={selected?.item} read={selected?.read} onClose={() => setSelected(undefined)}
        extra={selected && !selected.read && renderMarkRead(selected.item.id)} />
    </Card>
  )
}

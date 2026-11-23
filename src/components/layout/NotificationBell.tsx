import { BellOutlined } from '@ant-design/icons'
import { Alert, Badge, Button, Popover, Space, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fileDate } from '../../utils/fileResources'
import type { InboxNotification } from '../../utils/notifications'
import { useUpmsData } from '../../utils/useUpms'
import NotificationDetails from '../notifications/NotificationDetails'
import { useNotificationUnread } from '../notifications/notificationUnreadContext'

const recentQuery = { page: 1, size: 5, unreadOnly: true }

function RecentUnread({ onSelect, onClose }: { onSelect: (item: InboxNotification) => void; onClose: () => void }) {
  const recent = useUpmsData<InboxNotification[]>('/notifications/list', recentQuery)
  return (
    <Space orientation="vertical" size="small" role="region" aria-label="最近未读通知"
      style={{ width: 'min(340px, calc(100vw - 48px))' }}>
      {recent.loading ? <Typography.Text role="status" type="secondary">正在读取通知…</Typography.Text> : recent.error ? (
        <Alert type="error" showIcon title={recent.error}
          action={<Button size="small" onClick={recent.reload}>重试</Button>} />
      ) : recent.data?.length ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {recent.data.map((item) => (
            <li key={item.id}>
              <Button type="text" block style={{ height: 'auto', paddingBlock: 6 }} onClick={() => onSelect(item)}>
                <span style={{ minWidth: 0, width: '100%', textAlign: 'left' }}>
                  <Typography.Text strong ellipsis style={{ display: 'block' }}>{item.title}</Typography.Text>
                  <Typography.Text type="secondary">{fileDate(item.createdAt)}</Typography.Text>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      ) : <Typography.Text type="secondary">暂无未读通知</Typography.Text>}
      <div style={{ textAlign: 'right' }}><Link to="/notifications" onClick={onClose}>前往通知管理</Link></div>
    </Space>
  )
}

export default function NotificationBell() {
  const unread = useNotificationUnread()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<InboxNotification>()
  const count = unread.data?.count ?? 0

  return (
    <>
      <Popover trigger="click" placement="bottom" title="最近未读通知" destroyOnHidden open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) unread.reload()
        }}
        content={<RecentUnread onClose={() => setOpen(false)} onSelect={(item) => {
          setOpen(false)
          setSelected(item)
        }} />}>
        <Button type="text" aria-expanded={open} aria-label={count ? `通知，${count} 条未读` : '通知'}
          icon={<Badge count={count} size="small"><BellOutlined aria-hidden /></Badge>} />
      </Popover>
      <NotificationDetails item={selected} onClose={() => setSelected(undefined)} />
    </>
  )
}

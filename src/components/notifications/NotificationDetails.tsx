import { Descriptions, Drawer, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fileDate } from '../../utils/fileResources'
import { isNotificationActionPath, type InboxNotification } from '../../utils/notifications'

export default function NotificationDetails({ item, read = Boolean(item?.readAt), onClose, extra }: {
  item?: InboxNotification
  read?: boolean
  onClose: () => void
  extra?: ReactNode
}) {
  return (
    <Drawer title="通知详情" size="large" open={Boolean(item)} onClose={onClose} extra={extra}>
      {item && (
        <>
          <Typography.Title level={4} style={{ overflowWrap: 'anywhere' }}>{item.title}</Typography.Title>
          <Descriptions bordered size="small" column={1} items={[
            { key: 'category', label: '类别', children: item.category },
            { key: 'status', label: '状态', children: <Tag color={read ? 'default' : 'blue'}>{read ? '已读' : '未读'}</Tag> },
            { key: 'sender', label: '发送人 ID', children: item.senderId || '—' },
            { key: 'time', label: '接收时间', children: fileDate(item.createdAt) },
            ...(item.readAt ? [{ key: 'readAt', label: '已读时间', children: fileDate(item.readAt) }] : []),
            ...(item.actionUrl ? [{ key: 'action', label: '跳转地址', children: (
              <Typography.Text copyable={{ text: item.actionUrl }} style={{ overflowWrap: 'anywhere' }}>
                {isNotificationActionPath(item.actionUrl)
                  ? <Link to={item.actionUrl} onClick={onClose}>{item.actionUrl}</Link> : item.actionUrl}
              </Typography.Text>
            ) }] : []),
          ]} />
          <Typography.Title level={5} style={{ marginTop: 24 }}>通知正文</Typography.Title>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.body}</Typography.Paragraph>
        </>
      )}
    </Drawer>
  )
}

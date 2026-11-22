import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Button, Descriptions, Drawer, Space, Tag, Typography } from 'antd'
import { useCallback, useRef, useState } from 'react'
import { fileDate } from '../../utils/fileResources'
import { toUpmsPage } from '../../utils/upms'
import { upmsErrorText, useUpms } from '../../utils/useUpms'

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

function readStatus(read: boolean) {
  return <Tag color={read ? 'default' : 'blue'}>{read ? '已读' : '未读'}</Tag>
}

export default function NotificationsPage() {
  const request = useUpms()
  const { message } = App.useApp()
  const table = useRef<ActionType>(undefined)
  const [loadError, setLoadError] = useState('')
  const [markingId, setMarkingId] = useState<string>()
  const [detail, setDetail] = useState<{ item: InboxNotification; read: boolean }>()

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

  async function markRead(id: string) {
    if (markingId) return
    setMarkingId(id)
    try {
      await request('/notifications/read', { id })
      setDetail((current) => current?.item.id === id ? { ...current, read: true } : current)
      void table.current?.reload(true)
      void message.success('已标记为已读')
    } catch (failure) {
      void message.error(upmsErrorText(failure))
    } finally {
      setMarkingId(undefined)
    }
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
      title: '操作', key: 'actions', search: false, width: 180,
      render: (_, row) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => setDetail({ item: row, read: Boolean(row.readAt) })}>
            查看详情
          </Button>
          {!row.readAt && (
            <Button type="link" size="small" loading={markingId === row.id} disabled={Boolean(markingId) && markingId !== row.id}
              onClick={() => void markRead(row.id)}>标记已读</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <section aria-labelledby="notifications-heading">
      <Typography.Title id="notifications-heading" level={2}>通知管理</Typography.Title>
      {loadError && <Alert type="error" showIcon title={loadError}
        action={<Button size="small" onClick={() => void table.current?.reload()}>重试</Button>} />}
      <ProTable<InboxNotification, InboxFilters>
        rowKey="id" actionRef={table} request={loadPage} columns={columns}
        search={{ defaultCollapsed: false, labelWidth: 'auto' }}
        options={{ density: false, setting: false }} scroll={{ x: 720 }} locale={{ emptyText: '没有符合条件的通知' }}
        pagination={{ defaultPageSize: 20, pageSizeOptions: [10, 20, 50, 100], showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`, locale: { items_per_page: '条/页' } }}
      />
      <Drawer title="通知详情" size="large" open={Boolean(detail)} onClose={() => setDetail(undefined)}
        extra={detail && !detail.read && (
          <Button type="primary" loading={markingId === detail.item.id} disabled={Boolean(markingId) && markingId !== detail.item.id}
            onClick={() => void markRead(detail.item.id)}>标记已读</Button>
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
              ...(detail.item.actionUrl ? [{ key: 'action', label: '相关地址', children: (
                <Typography.Text copyable style={{ overflowWrap: 'anywhere' }}>{detail.item.actionUrl}</Typography.Text>
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

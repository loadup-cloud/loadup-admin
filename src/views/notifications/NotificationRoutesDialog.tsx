import { Alert, App, Button, Checkbox, Form, Input, Modal, Space, Table, Tag } from 'antd'
import { useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import { useUpms, useUpmsData } from '../../utils/useUpms'
import { notificationChannelOptions, notificationChannels, type NotificationRoute } from './notificationRoutes'

const routePath = '/notifications/routes'

export default function NotificationRoutesDialog({ onClose }: { onClose: () => void }) {
  const request = useUpms()
  const routes = useUpmsData<NotificationRoute[]>(routePath, undefined, 'GET')
  const [editing, setEditing] = useState<NotificationRoute>()
  const { message } = App.useApp()

  async function save(route: NotificationRoute) {
    await request(routePath, { serviceCode: route.serviceCode.trim(), channels: route.channels ?? [] }, 'PUT')
    void message.success('渠道配置已保存')
    routes.reload()
  }

  if (editing) {
    return (
      <UpmsFormDialog<NotificationRoute> title={editing.serviceCode ? '编辑通知渠道' : '新增通知渠道'}
        initialValues={editing} onSave={save} onClose={() => setEditing(undefined)}>
        <Form.Item name="serviceCode" label="Service Code" rules={[{
          required: true, pattern: /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/,
          message: '输入 1 至 64 位字母、数字，或在首位之后使用 _ . : -',
        }]}>
          <Input disabled={Boolean(editing.serviceCode)} maxLength={64} />
        </Form.Item>
        <Form.Item name="channels" label="投递渠道" extra="可同时启用多个渠道。清空后暂停该服务的投递。">
          <Checkbox.Group options={notificationChannelOptions} />
        </Form.Item>
      </UpmsFormDialog>
    )
  }

  return (
    <Modal open title="通知渠道配置" width={640} onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {routes.error && <Alert type="error" showIcon title={routes.error}
          action={<Button size="small" onClick={routes.reload}>重试</Button>} />}
        <Button type="primary" onClick={() => setEditing({ serviceCode: '', channels: [] })}>新增 Service Code</Button>
        <Table<NotificationRoute> rowKey="serviceCode" loading={routes.loading} dataSource={routes.data ?? []}
          pagination={{ pageSize: 8 }} locale={{ emptyText: '暂无渠道配置' }} columns={[
            { title: 'Service Code', dataIndex: 'serviceCode' },
            {
              title: '投递渠道', key: 'channels',
              render: (_, route) => route.channels.length > 0
                ? route.channels.map((channel) => <Tag key={channel}>{notificationChannels[channel].label}</Tag>)
                : <Tag>已暂停</Tag>,
            },
            { title: '操作', key: 'edit', render: (_, route) => <Button type="link" onClick={() => setEditing(route)}>编辑</Button> },
          ]} />
      </Space>
    </Modal>
  )
}

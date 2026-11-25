import { Alert, App, Button, Form, Input, Select, Tag } from 'antd'
import { useRef } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import UpmsUserSelect from '../../components/common/UpmsUserSelect'
import { isNotificationActionPath } from '../../utils/notifications'
import { useUpms, useUpmsData } from '../../utils/useUpms'
import { notificationChannels, type NotificationChannel, type NotificationRoute } from './notificationRoutes'

type PublishFields = {
  serviceCode: string
  recipientsByChannel: Partial<Record<NotificationChannel, string[]>>
  title: string
  body: string
  actionUrl?: string
}

const maxRecipients = 100

export default function PublishNotificationDialog({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const request = useUpms()
  const routes = useUpmsData<NotificationRoute[]>('/notifications/routes', undefined, 'GET')
  const enabledRoutes = (routes.data ?? []).filter((route) => route.channels.length > 0)
  const { message } = App.useApp()
  const requestKeys = useRef(new Map<string, string>())

  async function publish(fields: PublishFields) {
    const route = enabledRoutes.find(({ serviceCode }) => serviceCode === fields.serviceCode)
    if (!route) throw new Error('请选择已启用的 Service Code。')
    const recipientsByChannel = Object.fromEntries(route.channels.map((channel) => [
      channel, (fields.recipientsByChannel[channel] ?? []).map((value) => value.trim()).sort(),
    ]))
    const notification = {
      serviceCode: route.serviceCode, recipientsByChannel,
      title: fields.title.trim(), body: fields.body.trim(), actionUrl: fields.actionUrl?.trim() || undefined,
    }
    const signature = JSON.stringify(notification)
    let requestKey = requestKeys.current.get(signature)
    if (!requestKey) {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16))
      requestKey = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
      requestKeys.current.set(signature, requestKey)
    }
    const { data } = await request<{ notificationId: string }>('/notifications/publish', { ...notification, requestKey })
    if (!data?.notificationId) throw new Error('未收到受理结果，请重试。')
    void message.success(`已受理，将通过 ${route.channels.length} 个渠道投递`)
    onPublished()
  }

  return (
    <UpmsFormDialog<PublishFields> title="发布通知" okText="提交投递" onSave={publish} onClose={onClose}>
      {routes.error && <Alert type="error" showIcon title={routes.error}
        action={<Button size="small" onClick={routes.reload}>重试</Button>} />}
      <Form.Item name="serviceCode" label="Service Code" rules={[{ required: true, message: '请选择 Service Code' }]}>
        <Select loading={routes.loading} options={enabledRoutes.map(({ serviceCode }) => ({ label: serviceCode, value: serviceCode }))}
          placeholder="选择已配置的服务" notFoundContent="请先在通知渠道配置中启用服务" />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(previous, current) => previous.serviceCode !== current.serviceCode}>
        {({ getFieldValue }) => {
          const route = enabledRoutes.find(({ serviceCode }) => serviceCode === getFieldValue('serviceCode'))
          return route?.channels.map((channel) => {
            const config = notificationChannels[channel]
            return (
              <Form.Item key={channel} name={['recipientsByChannel', channel]} preserve={false}
                label={config.recipients} extra={<Tag>{config.label}</Tag>} rules={[{
                  required: true, type: 'array', min: 1, max: maxRecipients, message: '请填写 1 至 100 个收件地址',
                }]}>
                {channel === 'IN_APP'
                  ? <UpmsUserSelect mode="multiple" maxCount={maxRecipients} label={config.recipients} placeholder={config.placeholder} />
                  : <Select mode="tags" maxCount={maxRecipients} tokenSeparators={[',', '，']} placeholder={config.placeholder} />}
              </Form.Item>
            )
          }) ?? null
        }}
      </Form.Item>
      <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: '请输入标题' }]}>
        <Input maxLength={200} />
      </Form.Item>
      <Form.Item name="body" label="正文" rules={[{ required: true, whitespace: true, message: '请输入正文' }]}>
        <Input.TextArea rows={4} maxLength={4000} showCount />
      </Form.Item>
      <Form.Item name="actionUrl" label="站内跳转地址" rules={[{
        validator: async (_, value?: string) => {
          const path = value?.trim()
          if (path && !isNotificationActionPath(path)) throw new Error('请输入以 / 开头的站内路径，例如 /account/security。')
        },
      }]}>
        <Input placeholder="/account/security" maxLength={500} />
      </Form.Item>
    </UpmsFormDialog>
  )
}

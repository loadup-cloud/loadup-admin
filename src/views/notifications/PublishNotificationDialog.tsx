import { Alert, App, Button, Form, Input, Select } from 'antd'
import { useRef } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import UpmsUserSelect from '../../components/common/UpmsUserSelect'
import { useUpms, useUpmsData } from '../../utils/useUpms'
import { notificationChannels, type NotificationChannel, type NotificationRoute, type Receipt } from './notificationRoutes'

type PublishFields = {
  serviceCode: string
  recipientsByChannel?: Partial<Record<NotificationChannel, string[]>>
  parameters?: Record<string, string>
  platform?: string
  appId?: string
}

const maxRecipients = 100

export default function PublishNotificationDialog({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const request = useUpms()
  const routes = useUpmsData<NotificationRoute[]>('/gotone/routes', undefined, 'GET')
  const enabledRoutes = (routes.data ?? []).filter((route) => route.enabled)
  const { message } = App.useApp()
  const requestKeys = useRef(new Map<string, string>())

  async function publish(fields: PublishFields) {
    const route = enabledRoutes.find(({ serviceCode }) => serviceCode === fields.serviceCode)
    if (!route) throw new Error('请选择已启用的 Service Code。')
    const recipientsByChannel = Object.fromEntries(route.channels.filter(({ channel }) => channel !== 'WEBHOOK').map(({ channel }) => [
      channel, (fields.recipientsByChannel?.[channel] ?? []).map((value) => value.trim()).sort().map((address) =>
        channel === 'PUSH' ? { address, platform: fields.platform, appId: fields.appId } : { address }),
    ]))
    const parameters = Object.fromEntries(route.requiredParameters.map((parameter) => [parameter, fields.parameters?.[parameter] ?? '']))
    const notification = { serviceCode: route.serviceCode, recipientsByChannel, parameters }
    const signature = JSON.stringify(notification)
    let requestKey = requestKeys.current.get(signature)
    if (!requestKey) {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16))
      requestKey = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
      requestKeys.current.set(signature, requestKey)
    }
    const { data } = await request<Receipt>('/gotone/publish', { ...notification, requestKey })
    if (!data?.requestId) throw new Error('未收到受理结果，请重试。')
    void message.success(`已受理 ${data.targetCount} 笔投递，请在投递记录查看结果`)
    onPublished()
  }

  return (
    <UpmsFormDialog<PublishFields> title="发布通知" okText="提交投递" onSave={publish} onClose={onClose}>
      {routes.error && <Alert type="error" showIcon title={routes.error}
        action={<Button size="small" onClick={routes.reload}>重试</Button>} />}
      <Form.Item name="serviceCode" label="Service Code" rules={[{ required: true }]}>
        <Select loading={routes.loading} options={enabledRoutes.map(({ serviceCode, name }) => ({ label: `${name} · ${serviceCode}`, value: serviceCode }))}
          placeholder="选择已配置的服务" notFoundContent="请先发布服务编码配置" />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(previous, current) => previous.serviceCode !== current.serviceCode}>
        {({ getFieldValue }) => {
          const route = enabledRoutes.find(({ serviceCode }) => serviceCode === getFieldValue('serviceCode'))
          if (!route) return null
          return <section key={route.serviceCode}>
            {route.channels.map(({ channel, fields }) => {
              if (channel === 'WEBHOOK') return <Alert key={channel} type="info" title={`Webhook 端点 · ${fields.endpointCode}`} />
              const config = notificationChannels[channel]
              return <section key={channel}>
                <Form.Item name={['recipientsByChannel', channel]} preserve={false}
                  label={config.recipients} rules={[{ required: true, type: 'array', min: 1, max: maxRecipients }]}>
                  {channel === 'IN_APP'
                    ? <UpmsUserSelect mode="multiple" maxCount={maxRecipients} label={config.recipients} placeholder={config.placeholder} />
                    : <Select mode="tags" maxCount={maxRecipients} tokenSeparators={[',', '，']} placeholder={config.placeholder} />}
                </Form.Item>
                {channel === 'PUSH' && <>
                  <Form.Item name="platform" label="设备平台" preserve={false} rules={[{ required: true }]} initialValue={fields.platform}>
                    <Select options={(fields.platform ? [fields.platform] : ['ANDROID', 'IOS', 'WEB']).map((value) => ({ value }))} />
                  </Form.Item>
                  <Form.Item name="appId" label="应用标识" preserve={false} rules={[{ required: true }]}><Input /></Form.Item>
                </>}
              </section>
            })}
            {route.requiredParameters.map((parameter) => <Form.Item key={parameter} name={['parameters', parameter]}
              label={parameter} preserve={false} rules={[{ required: true }]}><Input maxLength={4000} /></Form.Item>)}
          </section>
        }}
      </Form.Item>
    </UpmsFormDialog>
  )
}

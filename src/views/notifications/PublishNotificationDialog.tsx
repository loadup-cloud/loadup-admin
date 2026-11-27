import { Alert, App, Button, Form, Input, Select, Space } from 'antd'
import { useRef } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import UpmsUserSelect from '../../components/common/UpmsUserSelect'
import { useUpms, useUpmsData } from '../../utils/useUpms'
import { notificationChannels, type Account, type NotificationChannel, type NotificationRoute, type Receipt } from './notificationRoutes'

type PublishFields = {
  serviceCode: string
  recipientsByChannel?: Partial<Record<NotificationChannel, string[]>>
  parameters?: Record<string, string>
  pushTargets?: { accountCode: string; tokens: string[] }[]
}

const maxRecipients = 100

export default function PublishNotificationDialog({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const request = useUpms()
  const routes = useUpmsData<NotificationRoute[]>('/gotone/routes', undefined, 'GET')
  const accounts = useUpmsData<Account[]>('/gotone/accounts', undefined, 'GET')
  const pushAccounts = (accounts.data ?? []).filter(({ channel, enabled }) => channel === 'PUSH' && enabled)
  const enabledRoutes = (routes.data ?? []).filter((route) => route.enabled)
  const { message } = App.useApp()
  const requestKeys = useRef(new Map<string, string>())

  async function publish(fields: PublishFields) {
    const route = enabledRoutes.find(({ serviceCode }) => serviceCode === fields.serviceCode)
    if (!route) throw new Error('请选择已启用的 Service Code。')
    const recipientsByChannel = Object.fromEntries(route.channels.filter(({ channel }) => channel !== 'WEBHOOK').map(({ channel }) => [
      channel, channel === 'PUSH'
        ? (fields.pushTargets ?? []).flatMap(({ accountCode, tokens }) => {
          const account = pushAccounts.find((item) => item.accountCode === accountCode)
          if (!account) throw new Error('请选择已启用的推送账号。')
          const { platform, appId } = account.settings
          return tokens.map((address) => ({ address: address.trim(), platform, appId, accountCode }))
        })
        : (fields.recipientsByChannel?.[channel] ?? []).map((value) => value.trim()).sort().map((address) => ({ address })),
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
              if (channel === 'WEBHOOK') return <Alert key={channel} type="info" title={`Webhook 端点 · ${fields.endpointCodes ?? fields.endpointCode}`} />
              if (channel === 'PUSH') return <PushTargets key={channel} platform={fields.platform}
                accounts={pushAccounts} loading={accounts.loading} error={accounts.error} />
              const config = notificationChannels[channel]
              return <section key={channel}>
                <Form.Item name={['recipientsByChannel', channel]} preserve={false}
                  label={config.recipients} rules={[{ required: true, type: 'array', min: 1, max: maxRecipients }]}>
                  {channel === 'IN_APP'
                    ? <UpmsUserSelect mode="multiple" maxCount={maxRecipients} label={config.recipients} placeholder={config.placeholder} />
                    : <Select mode="tags" maxCount={maxRecipients} tokenSeparators={[',', '，']} placeholder={config.placeholder} />}
                </Form.Item>
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


function PushTargets({ accounts, platform, loading, error }: {
  accounts: Account[]; platform?: string; loading: boolean; error?: string
}) {
  const options = accounts.filter((account) => !platform || account.settings.platform === platform)
    .map(({ adapter, accountCode, settings }) => ({
      value: accountCode, label: `${accountCode} · ${adapter} · ${settings.platform} · ${settings.appId}`,
    }))

  return <>
    {error && <Alert showIcon type="error" title={error} />}
    <Form.List name="pushTargets" rules={[{ validator: async (_, targets: PublishFields['pushTargets']) => {
      const count = (targets ?? []).reduce((sum, target) => sum + (target?.tokens?.length ?? 0), 0)
      if (!count || count > maxRecipients) throw new Error(`请填写 1 到 ${maxRecipients} 个推送令牌。`)
    } }]}>
      {(rows, { add, remove }, { errors }) => <>
        {rows.map(({ key, name }) => <Space key={key} align="baseline" wrap>
          <Form.Item name={[name, 'accountCode']} label="推送账号" rules={[{ required: true }]}>
            <Select options={options} loading={loading} placeholder="选择签发令牌的账号"
              style={{ minWidth: 220 }} />
          </Form.Item>
          <Form.Item name={[name, 'tokens']} label="设备令牌" rules={[{ required: true, type: 'array', min: 1 }]}>
            <Select mode="tags" maxCount={maxRecipients} tokenSeparators={[',', '，']} placeholder="输入令牌后按 Enter"
              style={{ minWidth: 220 }} />
          </Form.Item>
          <Button onClick={() => remove(name)}>移除</Button>
        </Space>)}
        <Form.ErrorList errors={errors} />
        <Button onClick={() => add()}>添加推送账号与令牌</Button>
      </>}
    </Form.List>
  </>
}

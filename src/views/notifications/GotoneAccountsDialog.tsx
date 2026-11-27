import { Alert, Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tabs, Tag } from 'antd'
import { useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import { useUpms, useUpmsData } from '../../utils/useUpms'
import { notificationChannels, withoutEmpty, type Account, type NotificationRoute } from './notificationRoutes'

type AccountFields = Omit<Account, 'version' | 'adapter'> & { adapterKey: string }
type Binding = { serviceCode: string; revision: number; accountCode: string; remoteTemplateId: string;
  remoteSignature?: string; variableMapping: Record<string, string> }
type BindingFields = Omit<Binding, 'variableMapping'> & { variables?: { provider: string; parameter: string }[] }

const adapters = {
  'SMS/twilio': { label: '短信 · Twilio', fields: [
    { key: 'accountSid', label: 'Account SID' }, { key: 'from', label: '发送号码' },
    { key: 'authUser', label: 'API Key SID（可选）', optional: true },
  ] },
  'SMS/aliyun': { label: '短信 · 阿里云', fields: [
    { key: 'accessKeyId', label: 'AccessKey ID' }, { key: 'signature', label: '默认签名（可选）', optional: true },
  ] },
  'SMS/tencent': { label: '短信 · 腾讯云', fields: [
    { key: 'secretId', label: 'SecretId' }, { key: 'sdkAppId', label: '短信 SdkAppId' },
    { key: 'region', label: '地域，例如 ap-guangzhou' },
    { key: 'signature', label: '默认签名（可选）', optional: true },
  ] },
  'EMAIL/smtp': { label: '邮件 · SMTP', fields: [
    { key: 'host', label: 'SMTP 主机' }, { key: 'port', label: '端口' },
    { key: 'tls', label: '加密方式', options: ['STARTTLS', 'SMTPS'] },
    { key: 'username', label: '账号' }, { key: 'fromAddress', label: '发件地址' },
    { key: 'fromName', label: '发件人名称（可选）', optional: true },
  ] },
  'PUSH/fcm': { label: '推送 · FCM', fields: [
    { key: 'projectId', label: 'Firebase 项目 ID' }, { key: 'appId', label: '应用标识' },
    { key: 'platform', label: '设备平台', options: ['ANDROID', 'IOS', 'WEB'] },
  ] },
  'PUSH/jpush': { label: '推送 · 极光', fields: [
    { key: 'appKey', label: 'AppKey' }, { key: 'appId', label: '应用标识' },
    { key: 'platform', label: '设备平台', options: ['ANDROID', 'IOS'] },
    { key: 'apnsProduction', label: 'APNs 生产环境（默认 true）', options: ['true', 'false'], optional: true },
  ] },
  'PUSH/xiaomi': { label: '推送 · 小米', fields: [
    { key: 'appId', label: '应用标识' },
    { key: 'platform', label: '设备平台', options: ['ANDROID'] },
    { key: 'packageName', label: 'Android 包名' },
    { key: 'channelId', label: '小米通知渠道 ID（可选）', optional: true },
  ] },
  'PUSH/huawei': { label: '推送 · 华为 Push Kit', fields: [
    { key: 'clientId', label: 'Client ID' }, { key: 'appId', label: '应用标识' },
    { key: 'platform', label: '设备平台', options: ['ANDROID'] },
  ] },
  'WEBHOOK/https': { label: 'Webhook · HTTPS', fields: [
    { key: 'url', label: 'HTTPS URL（无令牌）', optional: true },
    { key: 'destinationRef', label: '含令牌的 URL 凭证引用', optional: true },
  ] },
  'WEBHOOK/dingtalk': { label: 'Webhook · 钉钉', fields: [{ key: 'destinationRef', label: '机器人 URL 凭证引用' }] },
  'WEBHOOK/wecom': { label: 'Webhook · 企业微信', fields: [{ key: 'destinationRef', label: '机器人 URL 凭证引用' }] },
  'WEBHOOK/feishu': { label: 'Webhook · 飞书', fields: [{ key: 'destinationRef', label: '机器人 URL 凭证引用' }] },
}
type AdapterKey = keyof typeof adapters

function AccountEditor({ account, onClose, onSave }: { account?: Account; onClose: () => void; onSave: () => void }) {
  const request = useUpms()
  const initialValues: Partial<AccountFields> = account ? {
    ...account, adapterKey: `${account.channel}/${account.adapter}`,
  } : { enabled: true, priority: 100, connectTimeoutMs: 2000, requestTimeoutMs: 8000 }
  return <UpmsFormDialog<AccountFields> title={account ? `编辑 ${account.accountCode}` : '新增发送账号或端点'}
    initialValues={initialValues} onClose={onClose} onSave={async (values) => {
      const [channel, adapter] = values.adapterKey.split('/')
      await request('/gotone/accounts', {
        accountCode: values.accountCode, channel, adapter, enabled: values.enabled, priority: values.priority,
        secretRef: values.adapterKey === 'WEBHOOK/wecom' ? undefined : values.secretRef?.trim() || undefined, connectTimeoutMs: values.connectTimeoutMs,
        requestTimeoutMs: values.requestTimeoutMs, version: account?.version ?? 0, settings: withoutEmpty(values.settings),
      }, 'PUT')
      onSave()
    }}>
    <Form.Item name="accountCode" label="账号或端点编码" rules={[{ required: true, pattern: /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/ }]}>
      <Input disabled={Boolean(account)} />
    </Form.Item>
    <Form.Item name="adapterKey" label="渠道与适配器" rules={[{ required: true }]}>
      <Select disabled={Boolean(account)} options={Object.entries(adapters).map(([value, config]) => ({ value, label: config.label }))} />
    </Form.Item>
    <Form.Item noStyle shouldUpdate={(previous, current) => previous.adapterKey !== current.adapterKey}>
      {({ getFieldValue }) => {
        const key = getFieldValue('adapterKey') as AdapterKey
        const config = adapters[key]
        if (!config) return null
        return <section key={key}>
          {config.fields.map((field) => <Form.Item key={field.key} name={['settings', field.key]} label={field.label}
            preserve={false} rules={[{ required: !('optional' in field && field.optional), whitespace: true }]}>
            {'options' in field && field.options
              ? <Select options={field.options.map((value) => ({ value }))} />
              : <Input disabled={account?.channel === 'WEBHOOK'} />}
          </Form.Item>)}
          {key !== 'WEBHOOK/wecom' && <Form.Item name="secretRef" preserve={false}
            label={key.startsWith('WEBHOOK/') ? '签名密钥引用（可选）' : '凭证引用'}
            rules={[{ required: !key.startsWith('WEBHOOK/') }]} extra="使用 kms:名称 或 env:GOTONE_SECRET_名称">
            <Input placeholder="kms:gotone-email-primary" />
          </Form.Item>}
        </section>
      }}
    </Form.Item>
    <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
    <Space align="start" wrap>
      <Form.Item name="priority" label="优先级（从小到大）" rules={[{ required: true }]}><InputNumber precision={0} /></Form.Item>
      <Form.Item name="connectTimeoutMs" label="连接超时（毫秒）" rules={[{ required: true }]}><InputNumber min={100} max={5000} precision={0} /></Form.Item>
      <Form.Item name="requestTimeoutMs" label="请求超时（毫秒）" rules={[{ required: true }]}><InputNumber min={100} max={15000} precision={0} /></Form.Item>
    </Space>
  </UpmsFormDialog>
}

function SmsBindings({ accounts }: { accounts: Account[] }) {
  const request = useUpms()
  const bindings = useUpmsData<Binding[]>('/gotone/sms-bindings', undefined, 'GET')
  const routes = useUpmsData<NotificationRoute[]>('/gotone/routes', undefined, 'GET')
  const [editing, setEditing] = useState<Binding | true>()
  const initial = editing && editing !== true ? editing : undefined
  return <>
    {(bindings.error || routes.error) && <Alert showIcon type="error" title={bindings.error || routes.error} />}
    <Button type="primary" onClick={() => setEditing(true)}>新增备案模板映射</Button>
    <Table<Binding> rowKey={(row) => JSON.stringify([row.serviceCode, row.revision, row.accountCode])}
      dataSource={bindings.data ?? []} loading={bindings.loading} columns={[
        { title: 'Service Code', dataIndex: 'serviceCode' }, { title: '版本', dataIndex: 'revision' },
        { title: '发送账号', dataIndex: 'accountCode' }, { title: '供应商模板', dataIndex: 'remoteTemplateId' },
        { title: '操作', render: (_, row) => <Button type="link" onClick={() => setEditing(row)}>编辑</Button> },
      ]} />
    {editing && <UpmsFormDialog<BindingFields> title="短信备案模板映射" onClose={() => setEditing(undefined)}
      initialValues={initial && { ...initial, variables: Object.entries(initial.variableMapping).map(([provider, parameter]) => ({ provider, parameter })) }}
      onSave={async (values) => {
        const { variables, ...binding } = values
        await request('/gotone/sms-bindings', { ...binding, variableMapping: Object.fromEntries(
          (variables ?? []).map(({ provider, parameter }) => [provider, parameter]),
        ) }, 'PUT')
        bindings.reload()
      }}>
      <Form.Item name="serviceCode" label="Service Code" rules={[{ required: true }]}>
        <Select disabled={Boolean(initial)} options={(routes.data ?? []).filter((route) => route.channels.some(({ channel }) => channel === 'SMS'))
          .map(({ serviceCode, version }) => ({ value: serviceCode, label: `${serviceCode}（当前版本 ${version}）` }))} />
      </Form.Item>
      <Form.Item name="revision" label="服务编码版本" rules={[{ required: true }]}><InputNumber min={1} precision={0} disabled={Boolean(initial)} /></Form.Item>
      <Form.Item name="accountCode" label="短信账号" rules={[{ required: true }]}>
        <Select disabled={Boolean(initial)} options={accounts.filter(({ channel }) => channel === 'SMS')
          .map(({ accountCode }) => ({ value: accountCode }))} />
      </Form.Item>
      <Form.Item name="remoteTemplateId" label="供应商备案模板编号" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="remoteSignature" label="供应商备案签名"><Input /></Form.Item>
      <Form.Item noStyle shouldUpdate={(previous, current) => previous.accountCode !== current.accountCode}>
        {({ getFieldValue }) => accounts.some(({ accountCode, adapter }) => accountCode === getFieldValue('accountCode') && adapter === 'tencent')
          ? <Alert type="info" title="腾讯云模板变量按位置编号，从 1 开始连续填写。" /> : null}
      </Form.Item>
      <Form.List name="variables">
        {(fields, { add, remove }) => <>
          {fields.map(({ key, name }) => <Space key={key} align="baseline">
            <Form.Item name={[name, 'provider']} rules={[{ required: true }]}><Input placeholder="供应商变量" aria-label="供应商变量" /></Form.Item>
            <Form.Item name={[name, 'parameter']} rules={[{ required: true }]}><Input placeholder="服务编码参数" aria-label="服务编码参数" /></Form.Item>
            <Button onClick={() => remove(name)}>移除</Button>
          </Space>)}
          <Button onClick={() => add()}>添加变量映射</Button>
        </>}
      </Form.List>
    </UpmsFormDialog>}
  </>
}

export default function GotoneAccountsDialog({ onClose }: { onClose: () => void }) {
  const accounts = useUpmsData<Account[]>('/gotone/accounts', undefined, 'GET')
  const [edit, setEdit] = useState<Account | true>()
  const records = accounts.data ?? []
  return <>
    <Modal open title="系统发送配置" width={860} onCancel={onClose} footer={null}>
      {accounts.error && <Alert type="error" showIcon title={accounts.error} />}
      <Tabs items={[{ key: 'accounts', label: '发送账号与端点', children: <>
        <Space><Button onClick={accounts.reload}>刷新</Button><Button type="primary" onClick={() => setEdit(true)}>新增账号或端点</Button></Space>
        <Table<Account> rowKey="accountCode" dataSource={records} loading={accounts.loading} columns={[
          { title: '编码', dataIndex: 'accountCode' },
          { title: '渠道', render: (_, row) => notificationChannels[row.channel].label },
          { title: '适配器', dataIndex: 'adapter' },
          { title: '优先级', dataIndex: 'priority' },
          { title: '状态', render: (_, row) => <Tag color={row.enabled ? 'green' : 'default'}>{row.enabled ? '启用' : '停用'}</Tag> },
          { title: '操作', render: (_, row) => <Button type="link" onClick={() => setEdit(row)}>编辑</Button> },
        ]} />
      </> }, { key: 'bindings', label: '短信备案模板', children: <SmsBindings accounts={records} /> }]} />
    </Modal>
    {edit && <AccountEditor account={edit === true ? undefined : edit} onClose={() => setEdit(undefined)} onSave={accounts.reload} />}
  </>
}

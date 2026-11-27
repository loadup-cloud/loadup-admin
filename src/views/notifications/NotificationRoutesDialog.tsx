import { Alert, Button, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import { upmsErrorText, useUpms, useUpmsData } from '../../utils/useUpms'
import { notificationChannels, notificationChannelOptions, withoutEmpty } from './notificationRoutes'
import type { Account, NotificationChannel, NotificationRoute } from './notificationRoutes'

type RouteFields = Omit<NotificationRoute, 'channels' | 'version'> & {
  selected: NotificationChannel[]
  templates: Partial<Record<NotificationChannel, Record<string, string>>>
  webhookEndpoints?: string[]
  sample?: Record<string, string>
}
type Field = { key: string; label: string; required?: boolean; multiline?: boolean }
const fields: Record<NotificationChannel, Field[]> = {
  SMS: [{ key: 'body', label: '正文', required: true, multiline: true }, { key: 'templateCode', label: '逻辑模板编码' }],
  EMAIL: [{ key: 'subject', label: '主题', required: true }, { key: 'text', label: '文本正文', multiline: true },
    { key: 'html', label: 'HTML 正文', multiline: true }],
  IN_APP: [{ key: 'category', label: '类别', required: true }, { key: 'title', label: '标题', required: true },
    { key: 'body', label: '正文', required: true, multiline: true }, { key: 'actionPath', label: '站内跳转路径' }],
  PUSH: [{ key: 'title', label: '标题', required: true }, { key: 'body', label: '正文', required: true, multiline: true },
    { key: 'platform', label: '限定平台（ANDROID / IOS / WEB）' }, { key: 'ttlSeconds', label: '有效秒数' }],
  WEBHOOK: [],
}
const emptyRoute: RouteFields = { serviceCode: '', name: '', enabled: true, requiredParameters: [], selected: [], templates: {} }

function RouteEditor({ route, onClose, onSave }: {
  route?: NotificationRoute; onClose: () => void; onSave: () => void
}) {
  const request = useUpms()
  const endpoints = useUpmsData<Account[]>('/gotone/accounts', undefined, 'GET')
  const [preview, setPreview] = useState<Record<string, string>>()
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const initial: RouteFields = route ? {
    ...route, selected: route.channels.map(({ channel }) => channel),
    templates: Object.fromEntries(route.channels.map(({ channel, fields }) => [channel, fields])),
    webhookEndpoints: route.channels.filter(({ channel }) => channel === 'WEBHOOK')
      .flatMap(({ fields }) => (fields.endpointCodes ?? fields.endpointCode ?? '').split(',').map((code) => code.trim()).filter(Boolean)),
  } : emptyRoute

  function payload(values: RouteFields): NotificationRoute {
    return {
      serviceCode: values.serviceCode, name: values.name, description: values.description,
      version: route?.version ?? 0, enabled: values.enabled, requiredParameters: values.requiredParameters ?? [],
      channels: (values.selected ?? []).map((channel) => {
        const fields = withoutEmpty(values.templates?.[channel])
        if (channel === 'WEBHOOK') {
          delete fields.endpointCode
          delete fields.endpointCodes
          if (values.webhookEndpoints?.length) fields.endpointCodes = values.webhookEndpoints.join(',')
        }
        return { channel, fields }
      }),
    }
  }

  return (
    <UpmsFormDialog<RouteFields> title={route ? `编辑 ${route.serviceCode}` : '新建服务编码'} okText="发布配置"
      initialValues={initial} onClose={onClose} onSave={async (values) => {
        await request('/gotone/routes', payload(values), 'PUT')
        onSave()
      }}>
      <Form.Item name="serviceCode" label="Service Code" rules={[{ required: true, pattern: /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/ }]}>
        <Input disabled={Boolean(route)} />
      </Form.Item>
      <Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true }]}><Input maxLength={200} /></Form.Item>
      <Form.Item name="description" label="说明"><Input maxLength={500} /></Form.Item>
      <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item name="selected" label="渠道">
        <Checkbox.Group options={notificationChannelOptions} />
      </Form.Item>
      <Form.Item name="requiredParameters" label="模板参数" extra={'将变量写为 ${变量名}，按 Enter 添加参数。'}>
        <Select mode="tags" maxCount={50} tokenSeparators={[',', '，']} placeholder="例如 orderNo" />
      </Form.Item>
      {endpoints.error && <Alert showIcon type="error" title={endpoints.error} />}
      <Form.Item noStyle shouldUpdate={(a, b) => a.selected !== b.selected || a.requiredParameters !== b.requiredParameters}>
        {() => <RouteTemplateFields endpoints={endpoints.data ?? []} />}
      </Form.Item>
      <Form.Item noStyle shouldUpdate>
        {({ validateFields, getFieldsValue }) => (
          <Space><Button loading={draftSaving} onClick={() => {
            setDraftSaving(true)
            setPreviewError('')
            void validateFields(['serviceCode', 'name']).then(() => request('/gotone/routes/drafts', payload(getFieldsValue(true)), 'PUT'))
              .then(() => { onSave(); onClose() }).catch((error: unknown) => setPreviewError(upmsErrorText(error)))
              .finally(() => setDraftSaving(false))
          }}>保存草稿</Button><Button loading={previewLoading} onClick={() => {
            setPreview(undefined)
            setPreviewError('')
            setPreviewLoading(true)
            void validateFields().then((values) => request<Record<string, string>>('/gotone/routes/preview',
              { route: payload(values), parameters: values.sample ?? {} })).then(({ data }) => setPreview(data ?? {}))
              .catch((error: unknown) => setPreviewError(upmsErrorText(error))).finally(() => setPreviewLoading(false))
          }}>预览模板</Button></Space>
        )}
      </Form.Item>
      {previewError && <Alert type="warning" showIcon title={previewError} />}
      {preview && <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre>}
    </UpmsFormDialog>
  )
}

function RouteTemplateFields({ endpoints }: { endpoints: Account[] }) {
  const form = Form.useFormInstance<RouteFields>()
  const selected = Form.useWatch('selected', form) ?? []
  const parameters = Form.useWatch('requiredParameters', form) ?? []
  const selectedEndpoints = Form.useWatch('webhookEndpoints', form) ?? []
  const webhookAccounts = endpoints.filter(({ channel }) => channel === 'WEBHOOK')
  const selectedAccounts = webhookAccounts.filter(({ accountCode }) => selectedEndpoints.includes(accountCode))
  const robotAdapters = ['dingtalk', 'wecom', 'feishu']
  const needsText = selectedAccounts.some(({ adapter }) => robotAdapters.includes(adapter))
  const needsPayload = selectedAccounts.some(({ adapter }) => !robotAdapters.includes(adapter))
  return <>
    {selected.map((channel) => <section key={channel}>
      <Typography.Title level={5}>{notificationChannels[channel].label}模板</Typography.Title>
      {fields[channel].map((field) => (
        <Form.Item key={field.key} name={['templates', channel, field.key]} label={field.label}
          rules={field.required ? [{ required: true, whitespace: true }] : undefined}>
          {field.multiline ? <Input.TextArea rows={3} /> : <Input />}
        </Form.Item>
      ))}
      {channel === 'WEBHOOK' && <>
        <Form.Item name="webhookEndpoints" label="系统端点" rules={[{ required: true, type: 'array', min: 1, max: 20 }]}>
          <Select mode="multiple" maxCount={20} options={webhookAccounts.map(({ accountCode, adapter, enabled }) => ({
            value: accountCode, label: `${accountCode} · ${adapter}${enabled ? '' : '（停用）'}`,
          }))} />
        </Form.Item>
        {needsText && <Form.Item name={['templates', 'WEBHOOK', 'text']} label="机器人文本" preserve={false}
          rules={[{ required: true, whitespace: true }]}><Input.TextArea rows={3} /></Form.Item>}
        {needsPayload && <Form.Item name={['templates', 'WEBHOOK', 'payload']} label="HTTPS JSON 正文" preserve={false}
          rules={[{ required: true, whitespace: true }]}><Input.TextArea rows={3} /></Form.Item>}
      </>}
    </section>)}
    {parameters.length > 0 && <Typography.Title level={5}>预览参数</Typography.Title>}
    {parameters.map((parameter) => <Form.Item key={parameter} name={['sample', parameter]} label={parameter}><Input /></Form.Item>)}
  </>
}

export default function NotificationRoutesDialog({ onClose }: { onClose: () => void }) {
  const request = useUpms()
  const routes = useUpmsData<NotificationRoute[]>('/gotone/routes', undefined, 'GET')
  const drafts = useUpmsData<NotificationRoute[]>('/gotone/routes/drafts', undefined, 'GET')
  const [edit, setEdit] = useState<NotificationRoute | true>()
  const [restore, setRestore] = useState<NotificationRoute>()
  function reload() { routes.reload(); drafts.reload() }
  return <>
    <Modal open title="服务编码" width={840} onCancel={onClose} footer={
      <Space><Button onClick={reload}>刷新</Button><Button type="primary" onClick={() => setEdit(true)}>新建服务编码</Button></Space>
    }>
      {(routes.error || drafts.error) && <Alert type="error" showIcon title={routes.error || drafts.error} />}
      {Boolean(drafts.data?.length) && <Space wrap>
        <Typography.Text>我的草稿</Typography.Text>
        {drafts.data?.map((draft) => <Button key={draft.serviceCode} size="small" onClick={() => setEdit(draft)}>{draft.serviceCode}</Button>)}
      </Space>}
      <Table<NotificationRoute> rowKey="serviceCode" loading={routes.loading} dataSource={routes.data ?? []}
        columns={[
          { title: 'Service Code', dataIndex: 'serviceCode' },
          { title: '名称', dataIndex: 'name' },
          { title: '版本', dataIndex: 'version' },
          { title: '渠道', render: (_, row) => row.channels.map(({ channel }) => <Tag key={channel}>{notificationChannels[channel].label}</Tag>) },
          { title: '状态', render: (_, row) => <Tag color={row.enabled ? 'green' : 'default'}>{row.enabled ? '启用' : '暂停'}</Tag> },
          { title: '操作', render: (_, row) => <Space>
            <Button type="link" onClick={() => setEdit(row)}>编辑</Button>
            <Button type="link" disabled={row.version < 2} onClick={() => setRestore(row)}>恢复版本</Button>
          </Space> },
        ]} />
    </Modal>
    {edit && <RouteEditor route={edit === true ? undefined : edit} onClose={() => setEdit(undefined)} onSave={reload} />}
    {restore && <UpmsFormDialog<{ revision: number }> title={`恢复 ${restore.serviceCode} 的历史配置`} okText="发布为新版本"
      onClose={() => setRestore(undefined)} onSave={async ({ revision }) => {
        await request('/gotone/routes/restore', { serviceCode: restore.serviceCode, revision, expectedVersion: restore.version })
        reload()
      }}>
      <Form.Item name="revision" label="历史版本号" rules={[{ required: true }]}>
        <InputNumber min={1} max={restore.version - 1} precision={0} />
      </Form.Item>
    </UpmsFormDialog>}
  </>
}

import { Alert, Button, Card, Form, Input, Space, Tag } from 'antd'
import { useRef, useState } from 'react'
import DirectorySelect from './DirectorySelect'
import { approvalError, type Business, type Definition, type Instance, useApproval } from './model'

type StartFields = Business & { title: string }

export default function StartApplication({ app, onStarted }: { app: string; onStarted: (id: string) => void }) {
  const request = useApproval(app)
  const [flow, setFlow] = useState('')
  const [definition, setDefinition] = useState<Definition>()
  const [people, setPeople] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const retry = useRef<{ body: string; key: string }>(undefined)

  async function load() {
    setBusy(true)
    setError('')
    setDefinition(undefined)
    try {
      const result = await request<Definition>(`/flows/${encodeURIComponent(flow.trim())}/active`)
      setDefinition(result)
      setPeople(Object.fromEntries(result.spec.steps.flatMap((step) => step.defaultUserId
        && (step.mode === 'SELECT_AT_START' || step.allowOverride) ? [[step.key, step.defaultUserId]] : [])))
    } catch (failure) {
      setError(approvalError(failure))
    } finally {
      setBusy(false)
    }
  }

  async function submit({ title, ...business }: StartFields) {
    if (!definition) return
    const missing = definition.spec.steps.find((step) => step.mode === 'SELECT_AT_START' && !people[step.key])
    if (missing) {
      setError(`请选择${missing.name}的审批人`)
      return
    }
    const body = {
      flowKey: definition.flowKey, expectedDefinitionVersion: definition.version, business, title,
      selectedApprovers: Object.fromEntries(Object.entries(people).filter(([, value]) => value)),
    }
    const fingerprint = JSON.stringify(body)
    if (retry.current?.body !== fingerprint) retry.current = { body: fingerprint, key: crypto.randomUUID() }
    setBusy(true)
    setError('')
    try {
      const result = await request<Instance>('/instances', body, 'POST', { 'Idempotency-Key': retry.current.key })
      onStarted(result.id)
    } catch (failure) {
      setError(approvalError(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="发起审批">
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input aria-label="流程标识" placeholder="输入已发布的流程标识" maxLength={64} value={flow}
          disabled={busy} onChange={(e) => { setFlow(e.target.value); setDefinition(undefined) }} />
        <Button disabled={!flow.trim()} loading={busy} onClick={() => void load()}>加载流程</Button>
      </Space.Compact>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      {definition && <Form layout="vertical" disabled={busy} onFinish={submit} key={definition.id}>
        <Tag color="blue" style={{ marginBottom: 12 }}>{definition.spec.name} · v{definition.version}</Tag>
        {([
          ['title', '申请标题', 200], ['type', '业务类型', 64], ['id', '业务记录 ID', 128],
          ['version', '业务版本', 64], ['contentHash', '业务内容摘要', 128],
        ] as const).map(([name, label, maxLength]) => (
          <Form.Item key={name} name={name} label={label} rules={[{ required: true, whitespace: true }]}>
            <Input maxLength={maxLength} />
          </Form.Item>
        ))}
        {definition.spec.steps.map((step) => (
          <Form.Item key={step.key} label={step.name} required={step.mode === 'SELECT_AT_START'}>
            {(step.mode === 'SELECT_AT_START' || step.allowOverride) ? <DirectorySelect app={app} label={`选择${step.name}审批人`}
              path={`/flows/${definition.flowKey}/steps/${step.key}/eligible-users?version=${definition.version}`}
              value={people[step.key]} onChange={(value) => setPeople({ ...people, [step.key]: value ?? '' })} />
              : <Tag>{step.mode === 'ROLE' ? `角色待办 · ${step.roleId}` : `指定人员 · ${step.defaultUserId}`}</Tag>}
          </Form.Item>
        ))}
        <Button type="primary" htmlType="submit" loading={busy}>提交审批</Button>
      </Form>}
    </Card>
  )
}

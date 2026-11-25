import { Alert, Button, Card, Checkbox, Flex, Form, Input, Select, Space } from 'antd'
import { useState } from 'react'
import DirectorySelect from './DirectorySelect'
import { approvalError, type Definition, type Mode, type Rule, type Spec } from './model'

const modes: { label: string; value: Mode }[] = [
  { label: '指定用户', value: 'USER' },
  { label: '共享角色待办', value: 'ROLE' },
  { label: '发起时选人', value: 'SELECT_AT_START' },
]

const emptyStep = (): Rule => ({
  key: '', name: '', mode: 'SELECT_AT_START', allowOverride: false,
  scope: { users: [], roles: [], departments: [] },
})

const emptySpec = (): Spec => ({
  name: '', allowWithdraw: true, distinctApprovers: true, excludeApplicant: true, steps: [emptyStep()],
})

export default function TemplateEditor({ app, draft, save, cancel }: {
  app: string
  draft?: Definition
  save: (key: string, spec: Spec) => Promise<void>
  cancel: () => void
}) {
  const [flowKey, setFlowKey] = useState(draft?.flowKey ?? '')
  const [spec, setSpec] = useState(draft?.spec ?? emptySpec)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [rowKeys, setRowKeys] = useState(() => spec.steps.map(() => crypto.randomUUID()))

  function update(index: number, props: Partial<Rule>) {
    setSpec((before) => ({ ...before, steps: before.steps.map((step, row) => row === index ? { ...step, ...props } : step) }))
  }

  function move(index: number, next: number) {
    const steps = spec.steps.slice()
    const keys = rowKeys.slice()
    steps[next] = spec.steps[index]
    steps[index] = spec.steps[next]
    keys[next] = rowKeys[index]
    keys[index] = rowKeys[next]
    setSpec({ ...spec, steps })
    setRowKeys(keys)
  }

  async function submit() {
    setPending(true)
    setError('')
    try {
      await save(flowKey.trim(), spec)
    } catch (failure) {
      setError(approvalError(failure))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card title={draft ? `编辑 ${draft.flowKey} 草稿` : '新建流程草稿'}>
      <Form layout="vertical" onFinish={() => void submit()} disabled={pending}>
        <Flex gap="middle" wrap>
          <Form.Item label="流程标识" required htmlFor="approval-flow-key">
            <Input id="approval-flow-key" disabled={Boolean(draft)} value={flowKey} onChange={(e) => setFlowKey(e.target.value)}
              placeholder="例如 equipment.request" maxLength={64} required />
          </Form.Item>
          <Form.Item label="流程名称" required htmlFor="approval-flow-name">
            <Input id="approval-flow-name" value={spec.name} onChange={(e) => setSpec({ ...spec, name: e.target.value })}
              maxLength={200} required />
          </Form.Item>
        </Flex>
        <Space wrap style={{ marginBottom: 16 }}>
          <Checkbox checked={spec.allowWithdraw} onChange={(e) => setSpec({ ...spec, allowWithdraw: e.target.checked })}>允许撤回</Checkbox>
          <Checkbox checked={spec.excludeApplicant} onChange={(e) => setSpec({ ...spec, excludeApplicant: e.target.checked })}>禁止自审</Checkbox>
          <Checkbox checked={spec.distinctApprovers} onChange={(e) => setSpec({ ...spec, distinctApprovers: e.target.checked })}>各步骤由不同人员办理</Checkbox>
        </Space>
        <Flex vertical gap="middle">
          {spec.steps.map((step, index) => (
            <Card key={rowKeys[index]} size="small" title={step.name || `步骤 ${index + 1}`} extra={
              <Space>
                <Button size="small" disabled={index === 0} onClick={() => move(index, index - 1)}>上移</Button>
                <Button size="small" disabled={index === spec.steps.length - 1} onClick={() => move(index, index + 1)}>下移</Button>
                <Button size="small" danger onClick={() => {
                  setSpec({ ...spec, steps: spec.steps.filter((_, row) => row !== index) })
                  setRowKeys(rowKeys.filter((_, row) => row !== index))
                }}>删除</Button>
              </Space>
            }>
              <Flex gap="middle" wrap>
                <Form.Item label="步骤标识" required htmlFor={`approval-step-key-${index}`}>
                  <Input id={`approval-step-key-${index}`} value={step.key} onChange={(e) => update(index, { key: e.target.value })} maxLength={64} required />
                </Form.Item>
                <Form.Item label="步骤名称" required htmlFor={`approval-step-name-${index}`}>
                  <Input id={`approval-step-name-${index}`} value={step.name} onChange={(e) => update(index, { name: e.target.value })} maxLength={200} required />
                </Form.Item>
                <Form.Item label="指派方式">
                  <Select aria-label="指派方式" value={step.mode} options={modes} style={{ minWidth: 170 }} onChange={(mode) =>
                    update(index, { mode, defaultUserId: null, roleId: null, allowOverride: false })} />
                </Form.Item>
              </Flex>
              <Form.Item label={step.mode === 'ROLE' ? '办理角色' : '默认审批人'} required={step.mode !== 'SELECT_AT_START'}>
                <DirectorySelect key={step.mode} app={app} label={step.mode === 'ROLE' ? '搜索办理角色' : '搜索默认审批人'}
                  path={`/directory?type=${step.mode === 'ROLE' ? 'ROLE' : 'USER'}`}
                  value={step.roleId ?? step.defaultUserId ?? undefined}
                  onChange={(value) => update(index, step.mode === 'ROLE'
                    ? { roleId: value ?? null } : { defaultUserId: value ?? null })} />
              </Form.Item>
              {step.mode === 'USER' && <Checkbox checked={step.allowOverride} onChange={(e) => update(index, { allowOverride: e.target.checked })}>允许发起时改选</Checkbox>}
              <Flex gap="middle" wrap style={{ marginTop: 12 }}>
                {([['users', 'USER', '候选用户'], ['roles', 'ROLE', '候选角色'], ['departments', 'DEPARTMENT', '候选部门']] as const)
                  .map(([field, type, label]) => (
                    <Form.Item key={field} label={label} style={{ flex: '1 1 200px' }}>
                      <DirectorySelect app={app} path={`/directory?type=${type}`} label={label} multiple
                        value={step.scope[field]} onChange={(value) => update(index, { scope: { ...step.scope, [field]: value } })} />
                    </Form.Item>
                  ))}
              </Flex>
            </Card>
          ))}
          {error && <Alert type="error" title={error} showIcon />}
          <Space wrap>
            <Button disabled={spec.steps.length >= 32} onClick={() => {
              setSpec({ ...spec, steps: [...spec.steps, emptyStep()] })
              setRowKeys([...rowKeys, crypto.randomUUID()])
            }}>添加步骤</Button>
            <Button type="primary" htmlType="submit" loading={pending}>保存草稿</Button>
            <Button disabled={pending} onClick={cancel}>关闭编辑</Button>
          </Space>
        </Flex>
      </Form>
    </Card>
  )
}

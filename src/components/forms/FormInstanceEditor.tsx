import { Alert, Button, Card, Flex, Popconfirm, Tag, Typography } from 'antd'
import { useRef, useState } from 'react'
import { useUpms } from '../../utils/useUpms'
import { instancesPath, requireFormDetail } from './formApi'
import FormFields from './FormFields'
import { changeDraftSelection, changeDraftValue, formIssue, fromInstance, toDraftRequest, type FieldValue, type FormDetail, type FormIssue } from './formModel'

type Operation = 'save' | 'submit' | 'reload'

export default function FormInstanceEditor({ namespace, initialInstance }: {
  namespace: string
  initialInstance: FormDetail
}) {
  const request = useUpms()
  const [instance, setInstance] = useState(initialInstance)
  const [draft, setDraft] = useState(() => fromInstance(initialInstance))
  const [dirty, setDirty] = useState(false)
  const [operation, setOperation] = useState<Operation>()
  const [issue, setIssue] = useState<FormIssue>()
  const [notice, setNotice] = useState('')
  const pending = useRef(false)
  const submitAttempt = useRef<{ version: number; key: string }>(undefined)
  const path = instancesPath(namespace)
  const submitted = instance.status === 'SUBMITTED'

  function apply(next: FormDetail) {
    setInstance(next)
    setDraft(fromInstance(next))
    setDirty(false)
  }

  function edit() {
    setDirty(true)
    setIssue(undefined)
    setNotice('')
  }

  function select(itemKey: string, selected: boolean) {
    if (pending.current) return
    edit()
    setDraft((current) => changeDraftSelection(current, itemKey, selected))
  }

  function change(itemKey: string, fieldKey: string, value?: FieldValue) {
    if (pending.current) return
    edit()
    setDraft((current) => changeDraftValue(current, itemKey, fieldKey, value))
  }

  async function save() {
    const { data } = await request<FormDetail>(`${path}/draft`, toDraftRequest(instance, draft), 'PUT')
    const saved = requireFormDetail(data)
    apply(saved)
    return saved
  }

  async function run(action: Operation) {
    if (pending.current) return
    pending.current = true
    setOperation(action)
    setIssue(undefined)
    setNotice('')
    try {
      if (action === 'reload') {
        const { data } = await request<FormDetail>(`${path}/${encodeURIComponent(instance.id)}`, undefined, 'GET')
        apply(requireFormDetail(data))
        setNotice('已重新载入表单。')
      } else if (action === 'save') {
        await save()
        setNotice('草稿已保存。')
      } else {
        const current = dirty ? await save() : instance
        if (submitAttempt.current?.version !== current.rowVersion) {
          submitAttempt.current = { version: current.rowVersion, key: crypto.randomUUID() }
        }
        const { data } = await request<FormDetail>(`${path}/submit`, {
          instanceId: current.id,
          expectedRowVersion: current.rowVersion,
          requestKey: submitAttempt.current.key,
        })
        apply(requireFormDetail(data))
        setNotice('表单已提交。')
      }
    } catch (error) {
      setIssue(formIssue(error))
    } finally {
      pending.current = false
      setOperation(undefined)
    }
  }

  return (
    <Card title={submitted ? '提交结果' : '填写表单'}
      extra={<Tag color={submitted ? 'success' : 'processing'}>{submitted ? '已提交' : '草稿'}</Tag>}>
      <Flex vertical gap="middle">
        <Flex wrap align="center" gap="small">
          <Typography.Text type="secondary">定义版本 V{instance.release.version}</Typography.Text>
          <Typography.Text type="secondary" copyable={{ text: instance.id }} style={{ overflowWrap: 'anywhere' }}>
            申请编号 {instance.id}
          </Typography.Text>
        </Flex>
        {issue && !issue.fieldKey && <Alert showIcon type="error" title={issue.message} />}
        {notice && <Alert showIcon type="success" title={notice} />}
        <FormFields instance={instance} draft={draft} issue={issue}
          busy={Boolean(operation)} onSelect={select} onValue={change} />
        <Flex wrap gap="small">
          {!submitted && <>
            <Button disabled={Boolean(operation) || !dirty} loading={operation === 'save'}
              onClick={() => void run('save')}>保存草稿</Button>
            <Button type="primary" disabled={Boolean(operation)} loading={operation === 'submit'}
              onClick={() => void run('submit')}>提交</Button>
          </>}
          {dirty ? (
            <Popconfirm title="重新载入会丢弃本页未保存的修改。" okText="重新载入" cancelText="取消"
              onConfirm={() => run('reload')} disabled={Boolean(operation)}>
              <Button loading={operation === 'reload'} disabled={Boolean(operation)}>重新载入</Button>
            </Popconfirm>
          ) : (
            <Button loading={operation === 'reload'} disabled={Boolean(operation)}
              onClick={() => void run('reload')}>重新载入</Button>
          )}
        </Flex>
      </Flex>
    </Card>
  )
}

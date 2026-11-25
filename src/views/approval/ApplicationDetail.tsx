import { Alert, Button, Descriptions, Drawer, Flex, Form, Input, Space, Table, Tag, Timeline } from 'antd'
import { useEffect, useRef, useState } from 'react'
import DirectorySelect from './DirectorySelect'
import { approvalError, type Detail, statusLabels, type Step, useApproval, versionHeader } from './model'

const actionLabels: Record<string, string> = {
  SUBMITTED: '提交申请', ASSIGNEE_CHANGED: '调整审批人', APPROVED_STEP: '审批通过', REJECTED_STEP: '驳回', WITHDRAWN: '撤回',
}

export default function ApplicationDetail({ app, id, canRetry, close, onChange }: {
  app: string; id: string; canRetry: boolean; close: () => void; onChange: () => void
}) {
  const request = useApproval(app)
  const [detail, setDetail] = useState<Detail>()
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [reason, setReason] = useState('')
  const [people, setPeople] = useState<Record<string, string>>({})
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const last = useRef<{ fingerprint: string; key: string }>(undefined)

  useEffect(() => {
    let current = true
    void request<Detail>(`/instances/${id}`).then((value) => {
      if (current) { setDetail(value); setError('') }
    }).catch((failure) => {
      if (current) setError(approvalError(failure))
    })
    return () => { current = false }
  }, [id, request, reload])

  async function execute(path: string, body: object, method: 'POST' | 'PATCH' = 'POST') {
    if (!detail) return
    const fingerprint = JSON.stringify([path, body, detail.instance.revision])
    if (last.current?.fingerprint !== fingerprint) last.current = { fingerprint, key: crypto.randomUUID() }
    setBusy(true)
    setError('')
    try {
      await request(path, body, method, {
        ...versionHeader(detail.instance.revision), 'Idempotency-Key': last.current.key,
      })
      setEditing(false)
      setPeople({})
      setReason('')
      setComment('')
      setReload((value) => value + 1)
      onChange()
    } catch (failure) {
      setError(approvalError(failure))
    } finally {
      setBusy(false)
    }
  }

  const userLabel = (user?: string) => user ? detail?.userLabels[user] ?? user : ''
  const assignmentLabel = (user?: string, role?: string) =>
    user ? userLabel(user) : role ? `角色 · ${detail?.roleLabels[role] ?? role}` : ''
  const current = detail?.steps.find((step) => step.status === 'PENDING')
  const changes = Object.entries(people).filter(([, person]) => person)
    .map(([stepKey, assigneeId]) => ({ stepKey, assigneeId }))
  const refresh = () => {
    setDetail(undefined)
    setEditing(false)
    setPeople({})
    setReload((value) => value + 1)
  }

  return (
    <Drawer title={detail?.instance.title ?? '审批详情'} open onClose={close} size="large"
      extra={<Button disabled={busy} onClick={refresh}>刷新</Button>}>
      <Flex vertical gap="middle">
        {error && <Alert type="error" showIcon title={error} />}
        {!detail && !error && <Alert type="info" title="正在读取审批详情" />}
        {detail && <>
          <Descriptions column={2} size="small" items={[
            { key: 'status', label: '状态', children: <Tag>{statusLabels[detail.instance.status]}</Tag> },
            { key: 'flow', label: '流程', children: `${detail.instance.flowKey} · v${detail.instance.definitionVersion}` },
            { key: 'id', label: '业务记录', children: `${detail.instance.business.type} / ${detail.instance.business.id}` },
            { key: 'version', label: '业务版本', children: detail.instance.business.version },
            { key: 'hash', label: '业务内容摘要', span: 2, children: detail.instance.business.contentHash },
            ...(detail.deliveryStatus ? [{
              key: 'delivery', label: '结果投递', children: statusLabels[detail.deliveryStatus] ?? detail.deliveryStatus,
            }] : []),
          ]} />
          {detail.blocked && <Alert type="warning" showIcon title="现有指派无法满足后续审批规则，请调整审批人或撤回申请。" />}
          <Table<Step> size="small" rowKey="id" dataSource={detail.steps} pagination={false} columns={[
            { title: '步骤', render: (_, step) => step.rule.name },
            { title: '指派', render: (_, step) => assignmentLabel(step.assigneeUserId, step.assigneeRoleId) },
            { title: '状态', render: (_, step) => <Tag color={step.status === 'PENDING' ? 'processing' : undefined}>{statusLabels[step.status]}</Tag> },
            { title: '实际办理人', render: (_, step) => userLabel(step.completedBy) },
          ]} />
          {detail.canAdjust && !editing && <div><Button disabled={busy} onClick={() => setEditing(true)}>调整审批人</Button></div>}
          {detail.canAdjust && editing && <Form layout="vertical" disabled={busy} onFinish={() =>
            void execute(`/instances/${id}/assignments`, { changes, reason: reason.trim() }, 'PATCH')}>
            {detail.steps.filter((step) => step.status === 'PENDING' || step.status === 'WAITING').map((step) => (
              <Form.Item key={step.id} label={step.rule.name}>
                <DirectorySelect app={app} label={`选择${step.rule.name}的新审批人`}
                  path={`/instances/${id}/steps/${step.rule.key}/eligible-users`} value={people[step.rule.key]}
                  onChange={(value) => setPeople({ ...people, [step.rule.key]: value ?? '' })} />
              </Form.Item>
            ))}
            <Form.Item label="调整原因" htmlFor="approval-adjust-reason" required>
              <Input.TextArea id="approval-adjust-reason" value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" disabled={!changes.length || !reason.trim()} loading={busy}>保存调整</Button>
              <Button onClick={() => { setEditing(false); setPeople({}); setReason('') }}>取消</Button>
            </Space>
          </Form>}
          {(detail.canDecide || detail.canWithdraw || (canRetry && detail.deliveryStatus === 'FAILED')) && !editing && <>
            <Input.TextArea aria-label="办理意见" placeholder="填写意见，驳回和重投时必填" maxLength={2000}
              value={comment} disabled={busy} onChange={(e) => setComment(e.target.value)} />
            <Space wrap>
              {detail.canDecide && current && <>
                <Button type="primary" disabled={busy || detail.blocked} onClick={() =>
                  void execute(`/tasks/${current.id}/decisions`, { decision: 'APPROVE', comment: comment.trim() || null })}>通过</Button>
                <Button danger disabled={busy || !comment.trim()} onClick={() =>
                  void execute(`/tasks/${current.id}/decisions`, { decision: 'REJECT', comment: comment.trim() })}>驳回</Button>
              </>}
              {detail.canWithdraw && <Button disabled={busy} onClick={() =>
                void execute(`/instances/${id}/withdraw`, { reason: comment.trim() || null })}>撤回</Button>}
              {canRetry && detail.deliveryStatus === 'FAILED' && <Button disabled={busy || !comment.trim()} onClick={() =>
                void execute(`/instances/${id}/delivery/retry`, { reason: comment.trim() })}>重投结果</Button>}
            </Space>
          </>}
          <Timeline items={detail.actions.map((action) => ({
            key: action.revision,
            content: <div>
              <strong>{actionLabels[action.action] ?? action.action}</strong> · {userLabel(action.actorId)} · {new Date(action.occurredAt).toLocaleString()}
              {action.reason && <div>{action.reason}</div>}
              {action.changes.map((change) => <div key={change.stepKey}>
                {detail.steps.find((step) => step.rule.key === change.stepKey)?.rule.name ?? change.stepKey} · {[
                  assignmentLabel(change.beforeUserId, change.beforeRoleId),
                  assignmentLabel(change.afterUserId, change.afterRoleId),
                ].filter(Boolean).join(' → ')}
              </div>)}
            </div>,
          }))} />
        </>}
      </Flex>
    </Drawer>
  )
}

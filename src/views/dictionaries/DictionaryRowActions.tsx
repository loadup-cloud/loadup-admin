import { App, Button, Popconfirm, Space } from 'antd'
import { useState, type ReactNode } from 'react'
import { upmsErrorText } from '../../utils/useUpms'

export default function DictionaryRowActions({ name, enabled, onEdit, onToggle, onDelete, children }: {
  name: string
  enabled: boolean
  onEdit: () => void
  onToggle: () => Promise<void>
  onDelete: () => Promise<void>
  children?: ReactNode
}) {
  const { message } = App.useApp()
  const [pending, setPending] = useState<'toggle' | 'delete'>()
  const toggleLabel = enabled ? '停用' : '启用'

  async function run(action: 'toggle' | 'delete') {
    if (pending) return
    setPending(action)
    try {
      await (action === 'toggle' ? onToggle() : onDelete())
      void message.success(action === 'delete' ? '已删除' : `已${toggleLabel}`)
    } catch (failure) {
      void message.error(upmsErrorText(failure))
    } finally {
      setPending(undefined)
    }
  }

  return (
    <Space size={2} wrap>
      {children}
      <Button type="link" size="small" disabled={Boolean(pending)} onClick={onEdit}>编辑</Button>
      <Button type="link" size="small" aria-label={toggleLabel} disabled={pending === 'delete'} loading={pending === 'toggle'}
        onClick={() => void run('toggle')}>{toggleLabel}</Button>
      <Popconfirm title={`删除「${name}」？`} okText="确认删除" onConfirm={() => run('delete')}>
        <Button type="link" size="small" danger disabled={Boolean(pending)}>删除</Button>
      </Popconfirm>
    </Space>
  )
}

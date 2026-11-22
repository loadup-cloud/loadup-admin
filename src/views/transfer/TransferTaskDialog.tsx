import { Alert, Button, Form, Input, Pagination, Select, Space } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import type { FileResource } from '../../utils/fileResources'
import { toUpmsPage } from '../../utils/upms'
import { upmsErrorText, useUpms } from '../../utils/useUpms'
import { taskKinds, type TransferKind, type TransferTask } from './transferModels'

type SelectedFile = { value: string; label: string }
type TaskForm = { handlerKey: string; source?: SelectedFile; options?: string }

const sourcePageSize = 10

function SourceFileSelect({ id, value, onChange }: {
  id?: string
  value?: SelectedFile
  onChange?: (file?: SelectedFile) => void
}) {
  const request = useUpms()
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ page: number; revision: number; total: number; files: FileResource[]; error?: string }>()

  useEffect(() => {
    let active = true
    void request<FileResource[]>('/files/list', { page, size: sourcePageSize })
      .then((response) => {
        const { data, total } = toUpmsPage(response)
        if (active) setResult({ page, revision, files: data, total })
      })
      .catch((failure: unknown) => {
        if (active) setResult({ page, revision, files: [], total: 0, error: upmsErrorText(failure) })
      })
    return () => { active = false }
  }, [page, revision, request])

  const current = result?.page === page && result.revision === revision ? result : undefined
  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      <Select<SelectedFile>
        id={id} value={value} onChange={onChange} labelInValue allowClear
        placeholder="选择当前账号已上传的文件" style={{ width: '100%' }} loading={!current}
        options={current?.files.map(({ id, filename }) => ({ value: id, label: `${filename} · ${id.slice(-8)}` }))}
        notFoundContent={current ? '当前页暂无文件' : '正在加载文件…'}
      />
      {current?.error && <Alert type="error" showIcon title={current.error}
        action={<Button size="small" onClick={() => setRevision((value) => value + 1)}>重试</Button>} />}
      {(result?.total ?? 0) > sourcePageSize && (
        <Pagination aria-label="源文件分页" size="small" current={page} total={result?.total} pageSize={sourcePageSize}
          showSizeChanger={false} onChange={setPage} />
      )}
    </Space>
  )
}

function parseOptions(text?: string): Record<string, string> | undefined {
  if (!text?.trim()) return undefined
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('任务参数必须是有效的 JSON。')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('任务参数必须是 JSON 对象。')
  }
  const entries = Object.entries(value)
  if (entries.length > 30 || entries.some(([key, item]) =>
    !/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(key) || typeof item !== 'string' || item.length > 1000)) {
    throw new Error('最多填写 30 项参数。参数名须以字母开头，值须为最多 1000 字符的字符串。')
  }
  return Object.fromEntries(entries)
}

export default function TransferTaskDialog({ kind, onClose, onSubmitted }: {
  kind: TransferKind
  onClose: () => void
  onSubmitted: (task: TransferTask) => void
}) {
  const request = useUpms()
  const importing = kind === 'IMPORT'

  async function submit(values: TaskForm) {
    const { data } = await request<TransferTask>(importing ? '/transfer-tasks/imports' : '/transfer-tasks/exports', {
      handlerKey: values.handlerKey.trim(),
      sourceFileId: importing ? values.source?.value : undefined,
      options: parseOptions(values.options),
    })
    if (!data?.id) throw new Error('未收到任务编号，请刷新列表确认任务是否已提交。')
    onSubmitted(data)
  }

  return (
    <UpmsFormDialog<TaskForm> title={`提交${taskKinds[kind]}任务`} okText="提交任务" onSave={submit} onClose={onClose}>
      <Form.Item name="handlerKey" label="处理器标识" rules={[{ required: true, whitespace: true, message: '请输入处理器标识' }]}>
        <Input maxLength={64} placeholder={`本地示例：demo-csv-${importing ? 'import' : 'export'}`} />
      </Form.Item>
      {importing && (
        <Form.Item name="source" label="源文件" rules={[{ required: true, message: '请选择源文件' }]}
          extra={<>文件可先在<Link to="/files">文件资源</Link>中上传。</>}>
          <SourceFileSelect />
        </Form.Item>
      )}
      <Form.Item name="options" label="任务参数" extra="选填，格式为 JSON 对象，值为字符串。" rules={[{
        validator: async (_, value?: string) => { parseOptions(value) },
      }]}>
        <Input.TextArea rows={3} placeholder='{"format":"csv"}' />
      </Form.Item>
    </UpmsFormDialog>
  )
}

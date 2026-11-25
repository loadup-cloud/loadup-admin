import { Alert, Button, Card, Flex, Popconfirm, Space, Table, Tag } from 'antd'
import { useEffect, useState } from 'react'
import TemplateEditor from './TemplateEditor'
import { approvalError, type Definition, type Spec, statusLabels, useApproval, versionHeader } from './model'

const pageSize = 20

export default function Templates({ app }: { app: string }) {
  const request = useApproval(app)
  const [rows, setRows] = useState<Definition[]>([])
  const [editor, setEditor] = useState<Definition | 'new'>()
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [loaded, setLoaded] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    void request<Definition[]>(`/definitions?offset=${page * pageSize}&limit=${pageSize + 1}`).then((data) => {
      if (live) { setRows(data); setLoaded(refresh); setError('') }
    }).catch((failure) => {
      if (live) { setError(approvalError(failure)); setLoaded(refresh) }
    })
    return () => { live = false }
  }, [request, page, refresh])

  async function save(flowKey: string, spec: Spec) {
    if (editor && editor !== 'new') {
      await request(`/definitions/${editor.id}/draft`, spec, 'PUT', versionHeader(editor.revision))
    } else {
      await request('/definitions/drafts', { flowKey, spec }, 'POST')
    }
    setEditor(undefined)
    setRefresh((value) => value + 1)
  }

  async function action(row: Definition, operation: 'publish' | 'retire' | 'copy') {
    setBusy(true)
    setError('')
    try {
      if (operation === 'copy') {
        setEditor(await request<Definition>('/definitions/drafts', { flowKey: row.flowKey, sourceId: row.id }, 'POST'))
      } else {
        await request(`/definitions/${row.id}/${operation}`, undefined, 'POST', versionHeader(row.revision))
        setEditor(undefined)
      }
      setRefresh((value) => value + 1)
    } catch (failure) {
      setError(approvalError(failure))
    } finally {
      setBusy(false)
    }
  }

  if (editor) return <TemplateEditor key={editor === 'new' ? editor : editor.id}
    app={app} draft={editor === 'new' ? undefined : editor} save={save} cancel={() => setEditor(undefined)} />

  return (
    <Card>
      <Flex vertical gap="middle">
        <Flex justify="flex-end"><Button type="primary" onClick={() => setEditor('new')}>新建流程</Button></Flex>
        {error && <Alert type="error" showIcon title={error} />}
        <Table<Definition> rowKey="id" dataSource={rows.slice(0, pageSize)} loading={busy || loaded !== refresh}
          pagination={false} scroll={{ x: 680 }} columns={[
            { title: '流程', render: (_, row) => row.spec.name },
            { title: '标识', dataIndex: 'flowKey' },
            { title: '版本', dataIndex: 'version' },
            { title: '步骤', render: (_, row) => row.spec.steps.map((step) => step.name).join(' → ') || '—' },
            { title: '状态', render: (_, row) => <Tag color={row.status === 'ACTIVE' ? 'green' : undefined}>{statusLabels[row.status]}</Tag> },
            { title: '操作', render: (_, row) => row.status === 'DRAFT' ? <Space>
              <Button size="small" onClick={() => setEditor(row)}>编辑</Button>
              <Popconfirm title="发布该版本？" description="后续申请将使用此版本。" onConfirm={() => action(row, 'publish')}>
                <Button size="small" type="primary">发布</Button>
              </Popconfirm>
            </Space> : <Space>
              <Button size="small" onClick={() => void action(row, 'copy')}>复制为草稿</Button>
              {row.status === 'ACTIVE' && <Popconfirm title="退役此版本？" description="退役后该版本停止接受新申请。" onConfirm={() => action(row, 'retire')}>
                <Button size="small">退役</Button>
              </Popconfirm>}
            </Space> },
          ]} />
        <Space>
          <Button disabled={page === 0} onClick={() => setPage(page - 1)}>上一页</Button>
          <Button disabled={rows.length <= pageSize} onClick={() => setPage(page + 1)}>下一页</Button>
        </Space>
      </Flex>
    </Card>
  )
}

import { Alert, Button, Card, Flex, Space, Table, Tag } from 'antd'
import { useEffect, useState } from 'react'
import ApplicationDetail from './ApplicationDetail'
import StartApplication from './StartApplication'
import { approvalError, type Instance, type Task, statusLabels, useApproval } from './model'

const pageSize = 20

export default function Workbench({ app, mode, canRetry }: {
  app: string; mode: 'start' | 'mine' | 'instances'; canRetry: boolean
}) {
  const request = useApproval(app)
  const [id, setId] = useState<string>()
  const [rows, setRows] = useState<Task[]>([])
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [loaded, setLoaded] = useState('')
  const [error, setError] = useState('')
  const query = `${mode}:${page}:${refresh}`

  useEffect(() => {
    if (mode === 'start') return
    let current = true
    const pagination = `offset=${page * pageSize}&limit=${pageSize + 1}`
    const load = mode === 'mine'
      ? request<Task[]>(`/tasks/mine?${pagination}`)
      : request<Instance[]>(`/instances?${pagination}`).then((items) =>
        items.map((instance) => ({ instance, stepId: '', stepName: '' })))
    void load.then((data) => {
      if (current) { setRows(data); setError(''); setLoaded(query) }
    }).catch((failure) => {
      if (current) { setError(approvalError(failure)); setLoaded(query) }
    })
    return () => { current = false }
  }, [mode, page, request, query])

  return <>
    {mode === 'start' ? <StartApplication app={app} onStarted={setId} /> : <Card>
      <Flex vertical gap="middle">
        {error && <Alert type="error" showIcon title={error} />}
        <Table<Task> rowKey={(row) => row.instance.id} dataSource={rows.slice(0, pageSize)} loading={query !== loaded}
          pagination={false} scroll={{ x: 620 }} columns={[
            { title: '申请', render: (_, row) => row.instance.title },
            { title: '流程', render: (_, row) => row.instance.flowKey },
            ...(mode === 'mine' ? [{ title: '待办步骤', dataIndex: 'stepName' }] : []),
            { title: '状态', render: (_, row) => <Tag>{statusLabels[row.instance.status]}</Tag> },
            { title: '操作', render: (_, row) => <Button size="small" onClick={() => setId(row.instance.id)}>查看详情</Button> },
          ]} />
        <Space>
          <Button disabled={page === 0} onClick={() => setPage(page - 1)}>上一页</Button>
          <Button disabled={rows.length <= pageSize} onClick={() => setPage(page + 1)}>下一页</Button>
        </Space>
      </Flex>
    </Card>}
    {id && <ApplicationDetail key={id} app={app} id={id} canRetry={canRetry} close={() => setId(undefined)}
      onChange={() => setRefresh((value) => value + 1)} />}
  </>
}

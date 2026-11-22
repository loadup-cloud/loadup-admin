import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, Button, Descriptions, Drawer, Tag, Typography, type DatePicker } from 'antd'
import { useCallback, useRef, useState, type ComponentProps } from 'react'
import UpmsUserSelect from '../../components/common/UpmsUserSelect'
import { toUpmsPage } from '../../utils/upms'
import { upmsErrorText, useUpms } from '../../utils/useUpms'

type AuditEvent = {
  id: string
  actorId?: string | null
  action: string
  method?: string | null
  path?: string | null
  outcome?: string | null
  traceId?: string | null
  occurredAt: string
}

type AuditQuery = { actorId?: string; action?: string; from?: string; to?: string }
type RangeChange = NonNullable<ComponentProps<typeof DatePicker.RangePicker>['onChange']>
type TimeRange = Parameters<RangeChange>[0]

const localTimestamp = 'YYYY-MM-DDTHH:mm:ss'
const queryPath = '/audit/events/query'

function formatTimeRange(value: TimeRange) {
  const from = value?.[0]?.format(localTimestamp)
  const to = value?.[1]?.format(localTimestamp)
  return { from, to: to ? `${to}.999999` : undefined }
}

function showOutcome(outcome?: string | null) {
  if (outcome === 'SUCCESS') return <Tag color="green">成功</Tag>
  if (outcome === 'FAILURE') return <Tag color="red">失败</Tag>
  return outcome || '—'
}

export default function AuditPage() {
  const request = useUpms()
  const table = useRef<ActionType>(undefined)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<AuditEvent>()

  const loadPage = useCallback(async ({ current = 1, pageSize = 20, actorId, action, from, to }: AuditQuery & {
    current?: number
    pageSize?: number
  }) => {
    setError('')
    try {
      return toUpmsPage(await request<AuditEvent[]>(queryPath, {
        page: current, size: pageSize, actorId: actorId?.trim() || undefined,
        action: action?.trim() || undefined, from, to,
      }))
    } catch (failure) {
      setError(upmsErrorText(failure))
      return { data: [], total: 0, success: true }
    }
  }, [request])

  const columns: ProColumns<AuditEvent>[] = [
    {
      title: '操作人',
      dataIndex: 'actorId',
      hideInTable: true,
      formItemRender: () => <UpmsUserSelect label="操作人" placeholder="搜索账号、昵称或输入操作人 ID" />,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 250,
      ellipsis: true,
      fieldProps: { placeholder: '例如 UserController.create', allowClear: true },
    },
    {
      title: '操作时间',
      dataIndex: 'timeRange',
      hideInTable: true,
      valueType: 'dateTimeRange',
      tooltip: '按后端应用的本地时间查询。',
      fieldProps: {
        showTime: { format: 'HH:mm:ss' }, format: 'YYYY-MM-DD HH:mm:ss',
        allowEmpty: [true, true], placeholder: ['开始时间', '结束时间'],
      },
      search: { transform: formatTimeRange },
    },
    {
      title: '操作时间',
      dataIndex: 'occurredAt',
      search: false,
      width: 176,
      render: (_, row) => row.occurredAt?.replace('T', ' ').slice(0, 19) || '—',
    },
    { title: '操作人 ID', dataIndex: 'actorId', search: false, width: 164, ellipsis: true },
    { title: '请求方式', dataIndex: 'method', search: false, width: 94 },
    { title: '请求路径', dataIndex: 'path', search: false, width: 225, ellipsis: true },
    { title: '结果', dataIndex: 'outcome', search: false, width: 78, render: (_, row) => showOutcome(row.outcome) },
    {
      title: '操作',
      key: 'details',
      search: false,
      width: 90,
      render: (_, row) => <Button type="link" size="small" onClick={() => setSelected(row)}>查看详情</Button>,
    },
  ]

  return (
    <section aria-labelledby="audit-heading">
      <Typography.Title id="audit-heading" level={2}>审计日志</Typography.Title>
      {error && <Alert type="error" showIcon title={error}
        action={<Button size="small" onClick={() => void table.current?.reload()}>重试</Button>} />}
      <ProTable<AuditEvent, AuditQuery>
        rowKey="id" actionRef={table} request={loadPage} columns={columns} dateFormatter={false}
        search={{ defaultCollapsed: false, labelWidth: 'auto', span: { xs: 24, sm: 12, md: 12, lg: 12, xl: 12, xxl: 8 } }}
        options={{ density: false, setting: false }}
        scroll={{ x: 1077 }}
        pagination={{
          defaultPageSize: 20, pageSizeOptions: [10, 20, 50, 100], showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`, locale: { items_per_page: '条/页' },
        }}
        locale={{ emptyText: '没有符合条件的审计日志' }}
      />
      <Drawer title="审计日志详情" size="large" open={Boolean(selected)} onClose={() => setSelected(undefined)}>
        {selected && (
          <Descriptions bordered size="small" column={1} items={[
            { key: 'id', label: '事件 ID', children: selected.id },
            { key: 'actor', label: '操作人 ID', children: selected.actorId || '—' },
            { key: 'action', label: '操作类型', children: selected.action },
            { key: 'time', label: '操作时间', children: selected.occurredAt?.replace('T', ' ') || '—' },
            { key: 'method', label: '请求方式', children: selected.method || '—' },
            { key: 'path', label: '请求路径', children: selected.path || '—' },
            { key: 'outcome', label: '结果', children: showOutcome(selected.outcome) },
            { key: 'trace', label: 'Trace ID', children: selected.traceId
              ? <Typography.Text copyable>{selected.traceId}</Typography.Text> : '—' },
          ]} />
        )}
      </Drawer>
    </section>
  )
}

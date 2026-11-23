import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Button, Drawer, Space, Typography } from 'antd'
import { useCallback, useRef, useState } from 'react'
import UpmsUserSelect from '../../components/common/UpmsUserSelect'
import useUserStore from '../../store/user'
import { fileDate } from '../../utils/fileResources'
import { isSuperAdmin, toUpmsPage } from '../../utils/upms'
import { upmsErrorText, useUpms } from '../../utils/useUpms'
import TransferTaskDetails from './TransferTaskDetails'
import TransferTaskDialog from './TransferTaskDialog'
import { taskKinds, taskStatuses, type TransferKind, type TransferStatus, type TransferTask } from './transferModels'
import useTransferResultDownload from './useTransferResultDownload'

type TaskFilters = { ownerId?: string; kind?: TransferKind; status?: TransferStatus }

export default function TransferPage() {
  const request = useUpms()
  const { downloadResult, downloadingId } = useTransferResultDownload()
  const admin = useUserStore((state) => isSuperAdmin(state.session))
  const { message } = App.useApp()
  const table = useRef<ActionType>(undefined)
  const [submitting, setSubmitting] = useState<TransferKind>()
  const [details, setDetails] = useState<TransferTask>()
  const [loadError, setLoadError] = useState('')

  const loadPage = useCallback(async ({ current = 1, pageSize = 20, ownerId, kind, status }: TaskFilters & {
    current?: number
    pageSize?: number
  }) => {
    setLoadError('')
    try {
      return toUpmsPage(await request<TransferTask[]>('/transfer-tasks/list', {
        page: current, size: pageSize, ownerId: admin ? ownerId : undefined, kind, status,
      }))
    } catch (failure) {
      setLoadError(upmsErrorText(failure))
      return { data: [], total: 0, success: true }
    }
  }, [admin, request])

  const reloadTasks = useCallback(() => { void table.current?.reload() }, [])

  function taskSubmitted(task: TransferTask) {
    table.current?.reset?.()
    setDetails(task)
    void message.success('任务已提交')
  }

  const columns: ProColumns<TransferTask>[] = [
    { title: '任务类型', dataIndex: 'kind', valueType: 'select', valueEnum: taskKinds, width: 92 },
    { title: '任务状态', dataIndex: 'status', valueType: 'select', valueEnum: taskStatuses, width: 106 },
    {
      title: '所有者', dataIndex: 'ownerId', hideInTable: true, search: admin ? undefined : false,
      formItemRender: () => <UpmsUserSelect label="所有者" placeholder="搜索账号、昵称或输入所有者 ID" />,
    },
    { title: '处理器标识', dataIndex: 'handlerKey', search: false, ellipsis: true },
    { title: '所有者 ID', key: 'owner', dataIndex: 'ownerId', hideInTable: !admin, search: false, width: 145, ellipsis: true },
    { title: '处理进度', key: 'progress', search: false, width: 110, render: (_, row) => `${row.processedCount} / ${row.totalCount}` },
    { title: '提交时间', dataIndex: 'createdAt', search: false, width: 160, render: (_, row) => fileDate(row.createdAt) },
    {
      title: '操作', key: 'actions', search: false, width: 152,
      render: (_, row) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => setDetails(row)}>详情</Button>
          {row.status === 'SUCCEEDED' && row.resultFileId && (
            <Button type="link" size="small" loading={downloadingId === row.id}
              disabled={Boolean(downloadingId) && downloadingId !== row.id} onClick={() => void downloadResult(row.id)}>下载结果</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <section aria-labelledby="transfer-heading">
      <Typography.Title id="transfer-heading" level={2}>导入导出任务</Typography.Title>
      {loadError && <Alert type="error" showIcon title={loadError}
        action={<Button size="small" onClick={reloadTasks}>重试</Button>} />}
      <ProTable<TransferTask, TaskFilters> actionRef={table} columns={columns} request={loadPage} rowKey="id"
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ defaultPageSize: 20, pageSizeOptions: [10, 20, 50, 100], showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`, locale: { items_per_page: '条/页' } }}
        options={{ density: false, setting: false }} scroll={{ x: admin ? 950 : 800 }} locale={{ emptyText: '暂无任务' }}
        toolBarRender={() => [
          <Button key="import" type="primary" icon={<UploadOutlined aria-hidden />} onClick={() => setSubmitting('IMPORT')}>提交导入</Button>,
          <Button key="export" icon={<DownloadOutlined aria-hidden />} onClick={() => setSubmitting('EXPORT')}>提交导出</Button>,
        ]}
      />
      {submitting && <TransferTaskDialog kind={submitting} onClose={() => setSubmitting(undefined)} onSubmitted={taskSubmitted} />}
      <Drawer title="任务详情" size="large" open={Boolean(details)} onClose={() => setDetails(undefined)}>
        {details && <TransferTaskDetails key={details.id} initialTask={details} onUpdated={reloadTasks}
          downloading={downloadingId === details.id} onDownload={(task) => void downloadResult(task.id)} />}
      </Drawer>
    </section>
  )
}

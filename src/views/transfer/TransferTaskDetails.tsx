import { Alert, Button, Descriptions, Skeleton, Space, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { fileDate } from '../../utils/fileResources'
import { upmsErrorText, useUpms } from '../../utils/useUpms'
import { taskKinds, taskStatuses, type TransferTask } from './transferModels'

export default function TransferTaskDetails({ initialTask, onUpdated, onDownload, downloading }: {
  initialTask: TransferTask
  onUpdated: () => void
  onDownload: (task: TransferTask) => void
  downloading: boolean
}) {
  const request = useUpms()
  const [task, setTask] = useState<TransferTask>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    let timer: number | undefined
    let lastStatus = initialTask.status

    async function refresh() {
      try {
        const { data } = await request<TransferTask>('/transfer-tasks/detail', { id: initialTask.id })
        if (!active) return
        if (!data) throw new Error('未能读取任务详情。')
        setTask(data)
        if (data.status !== lastStatus) onUpdated()
        lastStatus = data.status
        if (data.status === 'QUEUED' || data.status === 'RUNNING') timer = window.setTimeout(refresh, 3000)
      } catch (failure) {
        if (active) setError(upmsErrorText(failure))
      }
    }

    void refresh()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [initialTask.id, initialTask.status, onUpdated, request, revision])

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {error && <Alert type="error" showIcon title={error} action={<Button size="small" onClick={() => {
        setError('')
        setRevision((value) => value + 1)
      }}>重试</Button>} />}
      {task ? (
        <Descriptions bordered column={1} size="small" items={[
          { key: 'id', label: '任务 ID', children: <Typography.Text copyable>{task.id}</Typography.Text> },
          { key: 'owner', label: '所有者 ID', children: task.ownerId },
          { key: 'kind', label: '任务类型', children: taskKinds[task.kind] },
          { key: 'handler', label: '处理器标识', children: task.handlerKey },
          { key: 'status', label: '任务状态', children: <Tag color={taskStatuses[task.status]?.color}>{taskStatuses[task.status]?.text ?? task.status}</Tag> },
          { key: 'progress', label: '处理进度', children: `${task.processedCount} / ${task.totalCount}` },
          { key: 'created', label: '提交时间', children: fileDate(task.createdAt) },
          { key: 'started', label: '开始时间', children: fileDate(task.startedAt) },
          { key: 'finished', label: '结束时间', children: fileDate(task.finishedAt) },
          { key: 'source', label: '源文件 ID', children: task.sourceFileId
            ? <Typography.Text copyable>{task.sourceFileId}</Typography.Text> : '—' },
          { key: 'result', label: '结果文件', children: task.status === 'SUCCEEDED' && task.resultFileId ? (
            <Space wrap>
              <Typography.Text copyable>{task.resultFileId}</Typography.Text>
              <Button loading={downloading} onClick={() => onDownload(task)}>下载结果</Button>
            </Space>
          ) : '—' },
          ...(task.errorMessage ? [{ key: 'error', label: '失败原因', children: task.errorMessage }] : []),
        ]} />
      ) : !error && <Skeleton active />}
    </Space>
  )
}

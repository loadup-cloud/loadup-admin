import { Alert, Button, Card, Empty, Flex, Skeleton, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { fileDate } from '../../utils/fileResources'
import { useUpmsData } from '../../utils/useUpms'
import { taskKinds, taskStatuses, type TransferTask } from '../transfer/transferModels'
import useTransferResultDownload from '../transfer/useTransferResultDownload'

const recentQuery = { page: 1, size: 5 }

export default function RecentTransferTasks() {
  const recent = useUpmsData<TransferTask[]>('/transfer-tasks/list', recentQuery)
  const { downloadResult, downloadingId } = useTransferResultDownload()
  const tasks = recent.data ?? []

  return (
    <Card title="我的最近导入导出任务" extra={<Link to="/transfer">全部任务</Link>}>
      <Flex justify="end">
        <Button size="small" loading={recent.loading} onClick={recent.reload}>刷新</Button>
      </Flex>
      {recent.error ? <Alert type="error" showIcon title={recent.error} style={{ marginTop: 12 }} />
        : tasks.length > 0 ? (
          <Flex component="ul" role="list" vertical gap="middle" style={{ padding: 0, marginBottom: 0 }}>
            {tasks.map((task) => (
              <Flex component="li" key={task.id} align="center" justify="space-between" gap="small" wrap="wrap">
                <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <Typography.Text strong ellipsis={{ tooltip: task.handlerKey }} style={{ display: 'block' }}>
                    {taskKinds[task.kind]} · {task.handlerKey}
                  </Typography.Text>
                  <Space wrap size="small">
                    <Tag color={taskStatuses[task.status]?.color}>{taskStatuses[task.status]?.text ?? task.status}</Tag>
                    <Typography.Text type="secondary">{fileDate(task.createdAt)}</Typography.Text>
                  </Space>
                </div>
                {task.status === 'SUCCEEDED' && task.resultFileId && (
                  <Button size="small" loading={downloadingId === task.id}
                    disabled={Boolean(downloadingId) && downloadingId !== task.id}
                    onClick={() => void downloadResult(task.id)}>下载结果</Button>
                )}
              </Flex>
            ))}
          </Flex>
        ) : recent.loading ? <Skeleton active />
          : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无导入导出任务" />}
    </Card>
  )
}

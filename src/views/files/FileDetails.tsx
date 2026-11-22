import { Alert, Button, Descriptions, Skeleton, Table, Typography, type TableColumnsType } from 'antd'
import { useEffect, useState } from 'react'
import { upmsErrorText, useUpms } from '../../utils/useUpms'
import { fileDate, fileSize, type FileReference, type FileResource } from './fileModels'

const referenceColumns: TableColumnsType<FileReference> = [
  { title: '业务类型', dataIndex: 'referenceType' },
  { title: '业务 ID', dataIndex: 'referenceId' },
  { title: '引用时间', dataIndex: 'createdAt', render: fileDate },
]

export default function FileDetails({ id }: { id: string }) {
  const request = useUpms()
  const [result, setResult] = useState<{ file: FileResource; references: FileReference[] }>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let current = true
    void Promise.all([
      request<FileResource>('/files/detail', { id }),
      request<FileReference[]>('/files/references', { id }),
    ]).then(([detail, references]) => {
      if (!detail.data || !Array.isArray(references.data)) throw new Error('无法读取文件详情或业务引用。')
      if (current) setResult({ file: detail.data, references: references.data })
    }).catch((failure: unknown) => {
      if (current) setError(upmsErrorText(failure))
    })
    return () => { current = false }
  }, [id, request, revision])

  if (error) {
    return <Alert type="error" showIcon title={error} action={<Button size="small" onClick={() => {
      setError('')
      setRevision((value) => value + 1)
    }}>重试</Button>} />
  }
  if (!result) return <Skeleton active />

  const { file, references } = result
  return (
    <>
      <Descriptions bordered column={1} size="small" items={[
        { key: 'filename', label: '文件名', children: file.filename },
        { key: 'id', label: '文件 ID', children: <Typography.Text copyable>{file.id}</Typography.Text> },
        { key: 'owner', label: '所有者 ID', children: file.ownerId },
        { key: 'size', label: '大小', children: fileSize(file.size) },
        { key: 'type', label: '内容类型', children: file.contentType },
        { key: 'provider', label: '存储服务', children: file.provider },
        { key: 'createdAt', label: '创建时间', children: fileDate(file.createdAt) },
        { key: 'updatedAt', label: '更新时间', children: fileDate(file.updatedAt) },
      ]} />
      <Typography.Title level={4} style={{ marginTop: 24 }}>业务引用</Typography.Title>
      <Table rowKey="id" columns={referenceColumns} dataSource={references} pagination={false} size="small"
        scroll={{ x: 480 }} locale={{ emptyText: '暂无业务引用' }} />
    </>
  )
}

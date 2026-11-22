import { UploadOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Button, Drawer, Form, Popconfirm, Space, Typography, Upload, type UploadFile } from 'antd'
import { useCallback, useRef, useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import UpmsUserSelect from '../../components/common/UpmsUserSelect'
import useUserStore from '../../store/user'
import { fileDate, fileSize, type FileResource } from '../../utils/fileResources'
import { isSuperAdmin, toUpmsPage } from '../../utils/upms'
import useFileDownload from '../../utils/useFileDownload'
import { upmsErrorText, useUpms } from '../../utils/useUpms'
import FileDetails from './FileDetails'

type FileFilters = { ownerId?: string }
type FileUpload = { files: UploadFile[] }

export default function FilesPage() {
  const request = useUpms()
  const downloadFile = useFileDownload()
  const admin = useUserStore((state) => isSuperAdmin(state.session))
  const { message } = App.useApp()
  const table = useRef<ActionType>(undefined)
  const [uploading, setUploading] = useState(false)
  const [detailsId, setDetailsId] = useState<string>()
  const [downloadingId, setDownloadingId] = useState<string>()
  const [loadError, setLoadError] = useState('')

  const loadPage = useCallback(async ({ current = 1, pageSize = 20, ownerId }: FileFilters & {
    current?: number
    pageSize?: number
  }) => {
    setLoadError('')
    try {
      return toUpmsPage(await request<FileResource[]>('/files/list', {
        page: current, size: pageSize, ownerId: admin ? ownerId : undefined,
      }))
    } catch (failure) {
      setLoadError(upmsErrorText(failure))
      return { data: [], total: 0, success: true }
    }
  }, [admin, request])

  async function upload({ files }: FileUpload) {
    const file = files[0]?.originFileObj
    if (!file) throw new Error('请选择要上传的文件。')
    const body = new FormData()
    body.append('file', file)
    await request('/files', body)
    if (admin) table.current?.reset?.()
    else void table.current?.reload(true)
    void message.success('文件已上传')
  }

  async function download(file: FileResource) {
    if (downloadingId) return
    setDownloadingId(file.id)
    try {
      await downloadFile(file.id, file.filename)
    } catch (failure) {
      void message.error(upmsErrorText(failure))
    } finally {
      setDownloadingId(undefined)
    }
  }

  async function remove(id: string) {
    try {
      await request('/files/delete', { id })
      void table.current?.reload(true)
      void message.success('文件已删除')
    } catch (failure) {
      void message.error(upmsErrorText(failure))
    }
  }

  const columns: ProColumns<FileResource>[] = [
    {
      title: '所有者',
      dataIndex: 'ownerId',
      hideInTable: true,
      formItemRender: () => <UpmsUserSelect label="所有者" placeholder="搜索账号、昵称或输入所有者 ID" />,
    },
    { title: '文件名', dataIndex: 'filename', search: false, width: 250, ellipsis: true },
    { title: '所有者 ID', key: 'owner', dataIndex: 'ownerId', search: false, hideInTable: !admin, width: 155, ellipsis: true },
    { title: '内容类型', dataIndex: 'contentType', search: false, width: 175, ellipsis: true },
    { title: '大小', dataIndex: 'size', search: false, width: 90, render: (_, row) => fileSize(row.size) },
    { title: '创建时间', dataIndex: 'createdAt', search: false, width: 160, render: (_, row) => fileDate(row.createdAt) },
    {
      title: '操作',
      key: 'actions',
      search: false,
      width: 176,
      render: (_, row) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => setDetailsId(row.id)}>详情</Button>
          <Button type="link" size="small" aria-label="下载" loading={downloadingId === row.id}
            disabled={Boolean(downloadingId) && downloadingId !== row.id} onClick={() => void download(row)}>下载</Button>
          <Popconfirm title={`删除「${row.filename}」？`} okText="确认删除" onConfirm={() => remove(row.id)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section aria-labelledby="files-heading">
      <Typography.Title id="files-heading" level={2}>文件资源</Typography.Title>
      {loadError && <Alert type="error" showIcon title={loadError}
        action={<Button size="small" onClick={() => void table.current?.reload()}>重试</Button>} />}
      <ProTable<FileResource, FileFilters>
        actionRef={table} columns={columns} request={loadPage} rowKey="id"
        search={admin ? { labelWidth: 'auto', defaultCollapsed: false } : false}
        pagination={{ defaultPageSize: 20, pageSizeOptions: [10, 20, 50, 100], showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`, locale: { items_per_page: '条/页' } }}
        options={{ density: false, setting: false }}
        scroll={{ x: admin ? 1006 : 851 }}
        locale={{ emptyText: '暂无文件' }}
        toolBarRender={() => [
          <Button key="upload" type="primary" icon={<UploadOutlined />} aria-label="上传文件" onClick={() => setUploading(true)}>上传文件</Button>,
        ]}
      />
      {uploading && (
        <UpmsFormDialog<FileUpload> title="上传文件" okText="上传" onSave={upload} onClose={() => setUploading(false)}>
          <Form.Item name="files" label="文件" extra="上传的文件归当前登录账号所有。" valuePropName="fileList"
            getValueFromEvent={({ fileList }: { fileList: UploadFile[] }) => fileList}
            rules={[{ required: true, type: 'array', min: 1, message: '请选择要上传的文件' }]}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button>选择文件</Button>
            </Upload>
          </Form.Item>
        </UpmsFormDialog>
      )}
      <Drawer title="文件详情" size="large" open={Boolean(detailsId)} onClose={() => setDetailsId(undefined)}>
        {detailsId && <FileDetails key={detailsId} id={detailsId} />}
      </Drawer>
    </section>
  )
}

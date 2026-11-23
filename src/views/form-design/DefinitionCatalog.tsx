import { PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Flex, Popconfirm, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import type { FormRelease } from '../../components/forms/formModel'
import { useUpms } from '../../utils/useUpms'
import { designError, type Kind, type Version } from './catalog'
import { pageSize, useCatalogPage } from './catalogData'
import CatalogPager from './CatalogPager'
import DefinitionEditor, { type EditorTarget } from './DefinitionEditor'
import ReleasePreview from './ReleasePreview'

const status = {
  DRAFT: { label: '草稿', color: 'processing' },
  PUBLISHED: { label: '已发布', color: 'success' },
  RETIRED: { label: '已退役', color: 'default' },
}

export default function DefinitionCatalog({ path, kind, canPublish }: { path: string; kind: Kind; canPublish: boolean }) {
  const request = useUpms()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState<EditorTarget>()
  const [preview, setPreview] = useState<FormRelease>()
  const [pending, setPending] = useState('')
  const [actionError, setActionError] = useState('')
  const resource = `${path}/${kind}`
  const { data, loading, error, reload } = useCatalogPage<Version>(resource, page)
  const isTemplate = kind === 'templates'
  const title = isTemplate ? '表单模板' : '字段组'

  async function action(row: Version, operation: 'publish' | 'preview' | 'retire') {
    if (pending) return
    setPending(`${row.id}/${operation}`)
    setActionError('')
    try {
      const url = `${resource}/${encodeURIComponent(row.id)}/${operation}`
      if (operation === 'preview') {
        const { data } = await request<FormRelease>(url, undefined, 'GET')
        if (!data?.items) throw new Error('表单服务未返回预览。')
        setPreview(data)
      } else {
        const { data } = await request<FormRelease>(url, { expectedRowVersion: row.rowVersion })
        reload()
        void message.success(operation === 'retire' ? '模板已退役。' : `${title}已发布。`)
        if (operation === 'publish' && isTemplate && data?.items) setPreview(data)
      }
    } catch (failure) {
      setActionError(designError(failure))
    } finally {
      setPending('')
    }
  }

  return (
    <>
      <Flex wrap justify="space-between" align="center" gap="small" style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">{isTemplate ? '组合已发布的字段组，配置条目和覆盖规则。'
          : '引用字段版本，设置控件、分区、排列顺序和默认值。'}</Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ mode: 'create' })}>新建{title}</Button>
      </Flex>
      {(actionError || error) && <Alert showIcon type="error" title={actionError || error} style={{ marginBottom: 12 }}
        action={<Button size="small" onClick={() => { setActionError(''); reload() }}>刷新列表</Button>} />}
      <Table<Version> rowKey="id" dataSource={error ? [] : data?.slice(0, pageSize)} loading={loading}
        pagination={false} scroll={{ x: 765 }} locale={{ emptyText: `还没有${title}` }}
        columns={[
          { title: `${title}编码`, render: (_, row) => <Typography.Text code>{row.code}</Typography.Text> },
          { title: '版本', dataIndex: 'version', render: (version) => `V${version}` },
          { title: '状态', render: (_, row) => <Tag color={status[row.status].color}>{status[row.status].label}</Tag> },
          { title: isTemplate ? '条目数' : '字段数',
            render: (_, row) => 'items' in row.definition ? row.definition.items.length : row.definition.fields.length },
          { title: '操作', width: 350, render: (_, row) => (
            <Flex wrap gap={0}>
              <Button type="link" size="small" onClick={() => setEditor({
                version: row, mode: row.status === 'DRAFT' ? 'edit' : 'view',
              })}>{row.status === 'DRAFT' ? '编辑' : '查看'}</Button>
              {row.status !== 'DRAFT' && <Button type="link" size="small"
                onClick={() => setEditor({ version: row, mode: 'copy' })}>新建版本</Button>}
              {isTemplate && <Button type="link" size="small" disabled={Boolean(pending)}
                loading={pending === `${row.id}/preview`} onClick={() => void action(row, 'preview')}>预览</Button>}
              {canPublish && row.status === 'DRAFT' && <Button type="link" size="small" disabled={Boolean(pending)}
                loading={pending === `${row.id}/publish`} onClick={() => void action(row, 'publish')}>发布</Button>}
              {canPublish && isTemplate && row.status === 'PUBLISHED' && (
                <Popconfirm title="退役后将停止从此版本创建新实例" okText="退役" cancelText="取消"
                  onConfirm={() => action(row, 'retire')}>
                  <Button type="link" size="small" danger disabled={Boolean(pending)}>退役</Button>
                </Popconfirm>
              )}
            </Flex>
          ) },
        ]}
      />
      <CatalogPager page={page} hasNext={(data?.length ?? 0) > pageSize && !error} loading={loading} onPage={setPage} />
      {editor && <DefinitionEditor path={path} kind={kind} target={editor} onClose={() => setEditor(undefined)}
        onSaved={() => { setEditor(undefined); reload(); void message.success('草稿已保存。') }} />}
      {preview && <ReleasePreview release={preview} onClose={() => setPreview(undefined)} />}
    </>
  )
}

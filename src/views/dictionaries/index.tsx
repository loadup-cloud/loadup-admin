import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Button, Drawer, Form, Input, Switch, Tag, Typography } from 'antd'
import { useRef, useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import { useUpms } from '../../utils/useUpms'
import DictionaryItems from './DictionaryItems'
import DictionaryRowActions from './DictionaryRowActions'
import { dictionaryPagination, statusFilterOptions, useDictionaryTable, type DictionaryFilters, type DictionaryType } from './dictionaryTable'

type TypeFields = { code: string; name: string; description?: string | null; enabled: boolean }

const matchesType = (row: DictionaryType, keyword: string) =>
  row.name.toLowerCase().includes(keyword) || row.code.toLowerCase().includes(keyword)

export default function DictionariesPage() {
  const request = useUpms()
  const { message } = App.useApp()
  const table = useRef<ActionType>(undefined)
  const [editing, setEditing] = useState<DictionaryType | null>()
  const [selected, setSelected] = useState<DictionaryType>()
  const { error, loadPage } = useDictionaryTable('types', matchesType)

  async function update(row: DictionaryType, fields: Pick<TypeFields, 'name' | 'description' | 'enabled'>) {
    await request('/dictionaries/types/update', { id: row.id, ...fields })
    void table.current?.reload()
  }

  async function save({ code, name, description, enabled }: TypeFields) {
    const fields = { name: name.trim(), description: description?.trim(), enabled }
    if (editing) {
      await update(editing, fields)
    } else {
      await request('/dictionaries/types/create', { code: code.trim(), ...fields })
      void table.current?.reload(true)
    }
    void message.success(editing ? '字典已更新' : '字典已新增')
  }

  const columns: ProColumns<DictionaryType>[] = [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '按字典名称或编码筛选', allowClear: true } },
    { title: '状态', dataIndex: 'status', hideInTable: true, valueType: 'select', fieldProps: { options: statusFilterOptions } },
    { title: '字典名称', dataIndex: 'name', search: false, width: 180, ellipsis: true },
    { title: '字典编码', dataIndex: 'code', search: false, width: 160, ellipsis: true },
    { title: '说明', dataIndex: 'description', search: false, width: 220, ellipsis: true },
    {
      title: '状态', dataIndex: 'enabled', search: false, width: 80,
      render: (_, row) => <Tag color={row.enabled ? 'green' : undefined}>{row.enabled ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作', search: false, width: 220,
      render: (_, row) => (
        <DictionaryRowActions name={row.name} enabled={row.enabled} onEdit={() => setEditing(row)}
          onToggle={() => update(row, { name: row.name, description: row.description, enabled: !row.enabled })}
          onDelete={async () => {
            await request('/dictionaries/types/delete', { id: row.id })
            void table.current?.reload(true)
          }}
        >
          <Button type="link" size="small" onClick={() => setSelected(row)}>字典项</Button>
        </DictionaryRowActions>
      ),
    },
  ]

  return (
    <section aria-labelledby="dictionaries-heading">
      <Typography.Title id="dictionaries-heading" level={2}>数据字典</Typography.Title>
      {error && <Alert type="error" showIcon title={error}
        action={<Button size="small" onClick={() => void table.current?.reload()}>重试</Button>} />}
      <ProTable<DictionaryType, DictionaryFilters>
        rowKey="id" actionRef={table} request={loadPage} columns={columns} pagination={dictionaryPagination}
        search={{ labelWidth: 'auto', defaultCollapsed: false, span: { xs: 24, sm: 12, md: 12, lg: 10, xl: 8, xxl: 8 } }}
        options={{ density: false, setting: false }}
        scroll={{ x: 860 }}
        locale={{ emptyText: '没有符合条件的字典' }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} aria-label="新增字典" onClick={() => setEditing(null)}>新增字典</Button>,
        ]}
      />
      {editing !== undefined && (
        <UpmsFormDialog<TypeFields>
          title={editing ? '编辑字典' : '新增字典'}
          initialValues={{
            name: editing?.name, code: editing?.code, description: editing?.description ?? '', enabled: editing?.enabled ?? true,
          }}
          onSave={save}
          onClose={() => setEditing(undefined)}
        >
          <Form.Item name="name" label="字典名称" rules={[{ required: true, whitespace: true, max: 100 }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="code" label="字典编码" rules={[{
            required: true, pattern: /^[a-z][a-z0-9_.-]{0,63}$/i, transform: (value: string) => value?.trim(),
            message: '编码须以字母开头，可包含字母、数字、下划线、点和连字符',
          }]}>
            <Input maxLength={64} disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item name="description" label="说明"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </UpmsFormDialog>
      )}
      <Drawer
        title={selected && `字典项：${selected.name}（${selected.code}）`}
        size={840} open={Boolean(selected)} onClose={() => setSelected(undefined)}
      >
        {selected && !selected.enabled && (
          <Alert type="info" showIcon title="此字典已停用，业务侧暂不返回其字典项。" style={{ marginBottom: 16 }} />
        )}
        {selected && <DictionaryItems key={selected.id} typeCode={selected.code} />}
      </Drawer>
    </section>
  )
}

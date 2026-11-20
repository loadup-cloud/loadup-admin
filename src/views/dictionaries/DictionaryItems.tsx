import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Alert, App, Button, Form, Input, InputNumber, Switch, Tag } from 'antd'
import { useRef, useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import { useUpms } from '../../utils/useUpms'
import DictionaryRowActions from './DictionaryRowActions'
import { dictionaryPagination, statusFilterOptions, useDictionaryTable, type DictionaryFilters, type DictionaryItem } from './dictionaryTable'

type ItemFields = { label: string; value: string; description?: string | null; sortOrder: number; enabled: boolean }

const matchesItem = (row: DictionaryItem, keyword: string) =>
  row.label.toLowerCase().includes(keyword) || row.value.toLowerCase().includes(keyword)

export default function DictionaryItems({ typeCode }: { typeCode: string }) {
  const request = useUpms()
  const { message } = App.useApp()
  const table = useRef<ActionType>(undefined)
  const [editing, setEditing] = useState<DictionaryItem | null>()
  const { error, loadPage } = useDictionaryTable('items', matchesItem, typeCode)

  async function update(row: DictionaryItem, fields: Pick<ItemFields, 'label' | 'description' | 'sortOrder' | 'enabled'>) {
    await request('/dictionaries/items/update', { id: row.id, ...fields })
    void table.current?.reload()
  }

  async function save({ value, label, description, sortOrder, enabled }: ItemFields) {
    const fields = { label: label.trim(), description: description?.trim(), sortOrder, enabled }
    if (editing) {
      await update(editing, fields)
    } else {
      await request('/dictionaries/items/create', { typeCode, value: value.trim(), ...fields })
      void table.current?.reload(true)
    }
    void message.success(editing ? '字典项已更新' : '字典项已新增')
  }

  const columns: ProColumns<DictionaryItem>[] = [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '按显示名称或值筛选', allowClear: true } },
    { title: '状态', dataIndex: 'status', hideInTable: true, valueType: 'select', fieldProps: { options: statusFilterOptions } },
    { title: '显示名称', dataIndex: 'label', search: false, width: 150, ellipsis: true },
    { title: '值', dataIndex: 'value', search: false, width: 138, ellipsis: true },
    { title: '排序', dataIndex: 'sortOrder', search: false, width: 75 },
    { title: '说明', dataIndex: 'description', search: false, width: 135, ellipsis: true },
    { title: '状态', dataIndex: 'enabled', search: false, width: 78,
      render: (_, row) => <Tag color={row.enabled ? 'green' : undefined}>{row.enabled ? '启用' : '停用'}</Tag> },
    {
      title: '操作', search: false, width: 170,
      render: (_, row) => (
        <DictionaryRowActions name={row.label} enabled={row.enabled} onEdit={() => setEditing(row)}
          onToggle={() => update(row, {
            label: row.label, description: row.description, sortOrder: row.sortOrder, enabled: !row.enabled,
          })}
          onDelete={async () => {
            await request('/dictionaries/items/delete', { id: row.id })
            void table.current?.reload(true)
          }}
        />
      ),
    },
  ]

  return (
    <>
      {error && <Alert type="error" showIcon title={error}
        action={<Button size="small" onClick={() => void table.current?.reload()}>重试</Button>} />}
      <ProTable<DictionaryItem, DictionaryFilters>
        rowKey="id" actionRef={table} columns={columns} request={loadPage} pagination={dictionaryPagination}
        search={{ labelWidth: 'auto', defaultCollapsed: false, span: { xs: 24, sm: 12, md: 12, lg: 12, xl: 12, xxl: 12 } }}
        options={{ density: false, setting: false }}
        scroll={{ x: 746 }}
        locale={{ emptyText: '没有符合条件的字典项' }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} aria-label="新增字典项" onClick={() => setEditing(null)}>新增字典项</Button>,
        ]}
      />
      {editing !== undefined && (
        <UpmsFormDialog<ItemFields>
          title={editing ? '编辑字典项' : '新增字典项'}
          initialValues={{
            label: editing?.label, value: editing?.value, description: editing?.description ?? '',
            sortOrder: editing?.sortOrder ?? 0, enabled: editing?.enabled ?? true,
          }}
          onSave={save}
          onClose={() => setEditing(undefined)}
        >
          <Form.Item name="label" label="显示名称" rules={[{ required: true, whitespace: true, max: 200 }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="value" label="值" rules={[{ required: true, whitespace: true, max: 128 }]}>
            <Input maxLength={128} disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}>
            <InputNumber precision={0} min={-2147483648} max={2147483647} />
          </Form.Item>
          <Form.Item name="description" label="说明"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </UpmsFormDialog>
      )}
    </>
  )
}

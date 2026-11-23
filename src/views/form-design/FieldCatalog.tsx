import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Flex, Form, Input, InputNumber, Select, Switch, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import type { FieldDefinition } from '../../components/forms/formModel'
import { useUpms } from '../../utils/useUpms'
import { codeRule, designError, fieldTypes, versionRule, type FieldVersion } from './catalog'
import { pageSize, useCatalogPage } from './catalogData'
import CatalogPager from './CatalogPager'

type FieldDraft = { version: number; field: FieldDefinition }

function FieldEditor({ source, onSave, onClose }: {
  source: FieldVersion | null
  onSave: (draft: FieldDraft) => Promise<void>
  onClose: () => void
}) {
  return (
    <UpmsFormDialog<FieldDraft> title={source ? '发布字段新版本' : '新增字段'} okText="发布字段"
      initialValues={source ? { version: Math.min(source.version + 1, 2147483647), field: source.field }
        : { version: 1, field: { key: '', label: '', type: 'TEXT', multiple: false, options: [] } }}
      onSave={onSave} onClose={onClose}>
      <Flex gap="middle">
        <Form.Item name={['field', 'key']} label="字段 Key" rules={[codeRule]} style={{ flex: 1 }}>
          <Input placeholder="如 DEVICE_TYPE" disabled={Boolean(source)} />
        </Form.Item>
        <Form.Item name="version" label="版本" rules={[versionRule]}>
          <InputNumber min={1} precision={0} />
        </Form.Item>
      </Flex>
      <Form.Item name={['field', 'label']} label="显示名称"
        rules={[{ required: true, whitespace: true, max: 160 }]}>
        <Input maxLength={160} />
      </Form.Item>
      <Form.Item name={['field', 'type']} label="字段类型" rules={[{ required: true }]}>
        <Select disabled={Boolean(source)} options={Object.entries(fieldTypes).map(([value, label]) => ({ value, label }))} />
      </Form.Item>
      <Form.Item name={['field', 'description']} label="填写提示">
        <Input.TextArea rows={2} maxLength={1000} />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, current) => prev.field?.type !== current.field?.type}>
        {({ getFieldValue }) => {
          const type = getFieldValue(['field', 'type'])
          if (type === 'TEXT') return (
            <Form.Item name={['field', 'constraints', 'maxLength']} label="最大长度">
              <InputNumber min={1} max={4000} precision={0} />
            </Form.Item>
          )
          if (type === 'INTEGER' || type === 'DECIMAL') return (
            <>
              <Form.Item name={['field', 'unit']} label="单位">
                <Input maxLength={64} disabled={Boolean(source)} />
              </Form.Item>
              <Flex gap="middle" wrap>
                <Form.Item name={['field', 'constraints', 'min']} label="最小值"><Input /></Form.Item>
                <Form.Item name={['field', 'constraints', 'max']} label="最大值"><Input /></Form.Item>
              </Flex>
            </>
          )
          if (type !== 'ENUM') return null
          return (
            <>
              <Form.Item name={['field', 'valueSetCode']} label="选项集编码"
                rules={[{ required: true, whitespace: true, max: 255 }]}>
                <Input placeholder="如 DEVICE_KIND" maxLength={255} disabled={Boolean(source)} />
              </Form.Item>
              <Form.Item name={['field', 'multiple']} label="允许多选" valuePropName="checked">
                <Switch disabled={Boolean(source)} />
              </Form.Item>
              <Form.List name={['field', 'options']} rules={[{
                validator: async (_, options?: FieldDefinition['options']) => {
                  if (!options?.length) throw new Error('至少添加一个选项。')
                  if (new Set(options.map((option) => option?.code)).size !== options.length) {
                    throw new Error('选项编码不能重复。')
                  }
                },
              }]}>
                {(rows, { add, remove }, { errors }) => (
                  <Flex vertical>
                    {rows.map(({ key, name }) => (
                      <Flex key={key} gap="small" align="start">
                        <Form.Item name={[name, 'code']} label="选项编码" rules={[codeRule]} style={{ flex: 1 }}>
                          <Input />
                        </Form.Item>
                        <Form.Item name={[name, 'label']} label="选项名称" rules={[{ required: true, whitespace: true, max: 160 }]}
                          style={{ flex: 1 }}>
                          <Input maxLength={160} />
                        </Form.Item>
                        <Button type="text" danger icon={<DeleteOutlined />} aria-label="移除选项"
                          style={{ marginTop: 28 }} onClick={() => remove(name)} />
                      </Flex>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ code: '', label: '' })}>添加选项</Button>
                    <Form.ErrorList errors={errors} />
                  </Flex>
                )}
              </Form.List>
            </>
          )
        }}
      </Form.Item>
    </UpmsFormDialog>
  )
}

export default function FieldCatalog({ path, canPublish }: { path: string; canPublish: boolean }) {
  const request = useUpms()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [prefix, setPrefix] = useState('')
  const [editing, setEditing] = useState<FieldVersion | null>()
  const { data, loading, error, reload } = useCatalogPage<FieldVersion>(
    `${path}/fields`, page, prefix ? `&keyPrefix=${encodeURIComponent(prefix)}` : '',
  )

  async function publish({ version, field }: FieldDraft) {
    const numeric = field.type === 'INTEGER' || field.type === 'DECIMAL'
    const enumeration = field.type === 'ENUM'
    const fieldDefinition = {
      ...field,
      label: field.label.trim(),
      description: field.description?.trim() || null,
      valueSetCode: enumeration ? field.valueSetCode?.trim() : null,
      multiple: enumeration && Boolean(field.multiple),
      unit: numeric ? field.unit?.trim() || null : null,
      options: enumeration ? (field.options ?? []).map((option) => ({ ...option, label: option.label.trim() })) : [],
      constraints: numeric ? { min: field.constraints?.min?.trim() || null, max: field.constraints?.max?.trim() || null }
        : field.type === 'TEXT' ? { maxLength: field.constraints?.maxLength ?? null } : null,
    }
    try {
      await request(`${path}/fields/publish`, { version, field: fieldDefinition })
      reload()
      void message.success('字段已发布。')
    } catch (failure) {
      throw Object.assign(new Error(designError(failure)), { cause: failure })
    }
  }

  return (
    <>
      <Flex wrap align="center" justify="space-between" gap="small" style={{ marginBottom: 16 }}>
        <Input.Search aria-label="按 Key 搜索" placeholder="按 Key 前缀搜索" allowClear maxLength={64}
          onSearch={(value) => { setPage(1); setPrefix(value.trim().toUpperCase()) }} style={{ width: 260 }} />
        {canPublish && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>新增字段</Button>}
      </Flex>
      {error && <Alert type="error" showIcon title={error}
        action={<Button size="small" onClick={reload}>重试</Button>} />}
      <Table<FieldVersion> rowKey="id" size="middle" loading={loading} pagination={false}
        style={{ marginTop: error ? 12 : 0 }}
        dataSource={error ? [] : data?.slice(0, pageSize)} scroll={{ x: 740 }} locale={{ emptyText: '没有匹配的字段' }}
        columns={[
          { title: '字段 Key', render: (_, row) => <Typography.Text code>{row.field.key}</Typography.Text> },
          { title: '显示名称', render: (_, row) => row.field.label },
          { title: '类型', render: (_, row) => row.field.type === 'ENUM'
            ? (row.field.multiple ? '枚举 · 多选' : '枚举 · 单选') : fieldTypes[row.field.type] },
          { title: '版本', dataIndex: 'version', render: (version) => `V${version}` },
          { title: '来源', render: (_, row) => <Tag>{row.systemOwned ? '程序登记' : '手工配置'}</Tag> },
          { title: '操作', render: (_, row) => canPublish && !row.systemOwned
            ? <Button type="link" onClick={() => setEditing(row)}>发布新版本</Button>
            : <Typography.Text type="secondary">只读</Typography.Text> },
        ]}
        expandable={{
          rowExpandable: (row) => Boolean(row.field.description || row.field.options.length || row.field.unit || row.field.constraints),
          expandedRowRender: ({ field }) => (
            <Flex vertical gap="small">
              {field.description && <Typography.Text>{field.description}</Typography.Text>}
              {field.unit && <Typography.Text>单位 {field.unit}</Typography.Text>}
              <Flex wrap gap="small">
                {field.constraints?.min != null && <Tag>最小值 {field.constraints.min}</Tag>}
                {field.constraints?.max != null && <Tag>最大值 {field.constraints.max}</Tag>}
                {field.constraints?.maxLength != null && <Tag>限 {field.constraints.maxLength} 字</Tag>}
                {field.options.map((option) => <Tag key={option.code}>{option.label} · {option.code}</Tag>)}
              </Flex>
            </Flex>
          ),
        }}
      />
      <CatalogPager page={page} hasNext={(data?.length ?? 0) > pageSize && !error}
        loading={loading} onPage={setPage} />
      {editing !== undefined && <FieldEditor source={editing} onSave={publish} onClose={() => setEditing(undefined)} />}
    </>
  )
}

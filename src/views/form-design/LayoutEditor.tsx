import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Collapse, Flex, Form, Input, Row, Select, Switch, Typography, type FormInstance } from 'antd'
import type { FieldDefinition } from '../../components/forms/formModel'
import { ITEM_KEY, widgetNames, widgets, type FieldVersion, type Group, type Item, type Placement, type Rule, type Version } from './catalog'
import DefaultInput from './DefaultInput'

export type EditorValues = { code: string; version: number; fields?: Placement[]; items?: Item[] }

function RowActions({ index, length, disabled, move, remove }: {
  index: number
  length: number
  disabled: boolean
  move: (from: number, to: number) => void
  remove: (index: number) => void
}) {
  if (disabled) return null
  return (
    <Flex gap={2}>
      <Button size="small" type="text" aria-label="上移" icon={<ArrowUpOutlined />}
        disabled={index === 0} onClick={() => move(index, index - 1)} />
      <Button size="small" type="text" aria-label="下移" icon={<ArrowDownOutlined />}
        disabled={index === length - 1} onClick={() => move(index, index + 1)} />
      <Button size="small" type="text" danger aria-label="移除" icon={<DeleteOutlined />} onClick={() => remove(index)} />
    </Flex>
  )
}

export function GroupLayout({ form, fields, disabled }: {
  form: FormInstance<EditorValues>
  fields: FieldVersion[]
  disabled: boolean
}) {
  const entries = Form.useWatch('fields', form) ?? []
  const byId = new Map(fields.map((version) => [version.id, version]))
  return (
    <Form.List name="fields" rules={[{ validator: async (_, value?: Placement[]) => {
      if (!value?.length) throw new Error('至少添加一个字段。')
      const keys = value.map((placement) => byId.get(placement?.fieldVersionId)?.field.key)
      if (keys.every(Boolean) && new Set(keys).size !== keys.length) throw new Error('一个字段组只能引用同一个 Key 一次。')
    } }]}>
      {(rows, { add, move, remove }, { errors }) => (
        <Flex vertical gap="small">
          {rows.map(({ name, key }) => {
            const placement = entries[name]
            const field = byId.get(placement?.fieldVersionId)?.field
            const used = new Set(entries.filter((_, index) => index !== name)
              .map((entry) => byId.get(entry?.fieldVersionId)?.field.key))
            return (
              <Card key={key} size="small" title={field?.label ?? '选择字段'}
                extra={<RowActions index={name} length={rows.length} disabled={disabled} move={move} remove={remove} />}>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item name={[name, 'fieldVersionId']} label="字段版本" rules={[{ required: true }]}>
                      <Select showSearch optionFilterProp="label" placeholder="从字段目录选择" options={fields.map((version) => ({
                        value: version.id,
                        label: `${version.field.label} · ${version.field.key} · V${version.version}`,
                        disabled: used.has(version.field.key),
                      }))} onChange={(id: string) => {
                        const selected = byId.get(id)
                        if (selected && field?.key !== selected.field.key) {
                          form.setFieldValue(['fields', name, 'widget'], widgets(selected.field)[0])
                          form.setFieldValue(['fields', name, 'initialValue'], null)
                        }
                      }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name={[name, 'widget']} label="控件" rules={[{ required: true }]}>
                      <Select disabled={disabled || !field}
                        options={field ? widgets(field).map((value) => ({ value, label: widgetNames[value] })) : []} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name={[name, 'section']} label="分区标题"><Input maxLength={160} placeholder="可选" /></Form.Item>
                  </Col>
                  {field && <Col xs={24} md={12}>
                    <Form.Item name={[name, 'initialValue']} label="默认值"><DefaultInput field={field} disabled={disabled} /></Form.Item>
                  </Col>}
                </Row>
                <Flex gap="large" wrap>
                  <Form.Item name={[name, 'required']} label="必填" valuePropName="checked"><Switch /></Form.Item>
                  <Form.Item name={[name, 'locked']} label="锁定" valuePropName="checked">
                    <Switch onChange={(locked) => {
                      if (locked) form.setFieldValue(['fields', name, 'templateOverrideAllowed'], false)
                    }} />
                  </Form.Item>
                  <Form.Item name={[name, 'templateOverrideAllowed']} label="允许模板覆盖" valuePropName="checked">
                    <Switch disabled={disabled || placement?.locked} />
                  </Form.Item>
                </Flex>
              </Card>
            )
          })}
          {!disabled && <Button type="dashed" icon={<PlusOutlined />} disabled={rows.length >= 128}
            onClick={() => add({ required: false, locked: false, templateOverrideAllowed: false })}>添加字段</Button>}
          <Form.ErrorList errors={errors} />
        </Flex>
      )}
    </Form.List>
  )
}

function ItemRules({ eligible, value, onChange, disabled }: {
  eligible: FieldDefinition[]
  value?: Record<string, Rule> | null
  onChange?: (next: Record<string, Rule>) => void
  disabled: boolean
}) {
  const rules = value ?? {}
  const byKey = new Map(eligible.map((field) => [field.key, field]))
  if (!eligible.length && !Object.keys(rules).length) return <Typography.Text type="secondary">当前字段组未开放覆盖项。</Typography.Text>
  function change(key: string, rule: Rule) {
    onChange?.({ ...rules, [key]: rule })
  }
  return (
    <Flex vertical gap="small">
      {!disabled && <Select aria-label="添加字段覆盖" showSearch optionFilterProp="label" placeholder="选择要覆盖的字段" value={null}
        options={eligible.filter((field) => !(field.key in rules)).map((field) => ({
          value: field.key, label: `${field.label} · ${field.key}`,
        }))}
        onChange={(key: string) => change(key, { required: false, locked: false })} />}
      {Object.entries(rules).map(([key, rule]) => {
        const field = byKey.get(key)
        return (
          <Card size="small" key={key} title={field ? `${field.label} · ${key}` : key}
            extra={!disabled && <Button type="text" danger aria-label="移除字段覆盖" icon={<DeleteOutlined />}
              onClick={() => {
                const next = { ...rules }
                delete next[key]
                onChange?.(next)
              }} />}>
            <Flex wrap align="center" gap="middle">
              <label><Switch checked={rule.required} disabled={disabled}
                onChange={(required) => change(key, { ...rule, required })} /> 设为必填</label>
              <label><Switch checked={rule.locked} disabled={disabled}
                onChange={(locked) => change(key, { ...rule, locked })} /> 锁定</label>
            </Flex>
            {field?.type === 'ENUM' && (
              <Form.Item label="允许的选项" style={{ marginTop: 12 }}>
                <Select aria-label="允许的选项" mode="multiple" allowClear disabled={disabled}
                  placeholder="沿用字段组选项" value={rule.allowedOptions ?? []}
                  options={field.options.map(({ code, label }) => ({ value: code, label }))}
                  onChange={(allowedOptions: string[]) => change(key, {
                    ...rule, allowedOptions: allowedOptions.length ? allowedOptions : null,
                  })} />
              </Form.Item>
            )}
            {field && <Form.Item label="模板默认值" style={{ marginTop: 12, marginBottom: 0 }}>
              <DefaultInput field={field} disabled={disabled} value={rule.initialValue}
                onChange={(initialValue) => change(key, { ...rule, initialValue })} />
            </Form.Item>}
          </Card>
        )
      })}
    </Flex>
  )
}

export function TemplateLayout({ form, fields, groups, disabled }: {
  form: FormInstance<EditorValues>
  fields: FieldVersion[]
  groups: Version<Group>[]
  disabled: boolean
}) {
  const entries = Form.useWatch('items', form) ?? []
  const byId = new Map(fields.map((version) => [version.id, version.field]))
  const groupsById = new Map(groups.map((group) => [group.id, group]))
  return (
    <Form.List name="items" rules={[{ validator: async (_, items?: Item[]) => {
      if (!items?.length) throw new Error('至少添加一个条目。')
      const keys = items.map((item) => item?.itemKey)
      if (new Set(keys).size !== keys.length) throw new Error('条目 Key 不能重复。')
      if (keys.includes('ROOT') && keys.length > 1) throw new Error('多个条目时请为每个条目设置独立 Key。')
    } }]}>
      {(rows, { add, remove, move }, { errors }) => (
        <Flex vertical gap="small">
          {rows.map(({ name, key }) => {
            const item = entries[name]
            const group = groupsById.get(item?.groupVersionId)
            const eligible = group?.definition.fields.flatMap((placement) => {
              const field = byId.get(placement.fieldVersionId)
              return field && placement.templateOverrideAllowed && !placement.locked ? [field] : []
            }) ?? []
            return (
              <Card key={key} size="small" title={item?.itemKey || '表单条目'}
                extra={<RowActions index={name} length={rows.length} disabled={disabled} move={move} remove={remove} />}>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item name={[name, 'itemKey']} label="条目 Key"
                      rules={[{ required: true, max: 128, pattern: ITEM_KEY, message: '请输入如 ROOT 或 BASE.ONLINE 的大写条目 Key。' }]}>
                      <Input maxLength={128} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name={[name, 'groupVersionId']} label="字段组版本" rules={[{ required: true }]}>
                      <Select showSearch optionFilterProp="label" placeholder="选择已发布的字段组"
                        options={groups.filter((row) => row.status === 'PUBLISHED' || row.id === item?.groupVersionId)
                          .map((row) => ({ value: row.id, label: `${row.code} · V${row.version}` }))}
                        onChange={() => form.setFieldValue(['items', name, 'rules'], {})} />
                    </Form.Item>
                  </Col>
                </Row>
                <Flex gap="large" wrap>
                  <Form.Item name={[name, 'required']} label="必选" valuePropName="checked">
                    <Switch onChange={(required) => {
                      if (required) form.setFieldValue(['items', name, 'defaultSelected'], true)
                    }} />
                  </Form.Item>
                  <Form.Item name={[name, 'defaultSelected']} label="默认选中" valuePropName="checked">
                    <Switch disabled={disabled || item?.required} />
                  </Form.Item>
                </Flex>
                {group && <Collapse size="small" items={[{
                  key: 'rules', label: '字段覆盖规则',
                  children: <Form.Item name={[name, 'rules']} noStyle>
                    <ItemRules eligible={eligible} disabled={disabled} />
                  </Form.Item>,
                }]} />}
              </Card>
            )
          })}
          {!disabled && <Button type="dashed" icon={<PlusOutlined />} disabled={rows.length >= 32}
            onClick={() => add({ itemKey: rows.length ? '' : 'ROOT', required: true, defaultSelected: true, rules: {} })}>添加条目</Button>}
          <Form.ErrorList errors={errors} />
        </Flex>
      )}
    </Form.List>
  )
}

import { Button, Checkbox, Divider, Form, Input, Select, Typography } from 'antd'
import { useId, type ReactNode } from 'react'
import type { Draft, FieldValue, FormDetail, FormField, FormIssue } from './formModel'

function displayValue(schema: FormField, value?: FieldValue | null) {
  if (value == null) return '未填写'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (schema.field.type !== 'ENUM') return String(value)
  const label = (code: string) => schema.field.options.find((option) => option.code === code)?.label ?? code
  return (Array.isArray(value) ? value : [String(value)]).map(label).join('、')
}

function FieldControl({ schema, value, submitted, busy, issue, change, reset }: {
  schema: FormField
  value?: FieldValue | null
  submitted: boolean
  busy: boolean
  issue?: string
  change: (value: FieldValue) => void
  reset?: () => void
}) {
  const id = useId()
  const { field, widget, required } = schema
  const options = field.options.map(({ code, label }) => ({ value: code, label }))
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  const readonly = submitted || schema.locked
  let control: ReactNode
  if (readonly) {
    control = <div id={id} style={{ paddingBlock: 4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {displayValue(schema, value)}
    </div>
  } else {
    const props = { id, disabled: busy, 'aria-required': required, 'aria-invalid': Boolean(issue), style: { width: '100%' } }
    switch (widget) {
      case 'SELECT':
        control = <Select {...props} value={text || undefined} options={options}
          allowClear onChange={(next: string | undefined) => change(next ?? '')} />
        break
      case 'MULTI_SELECT':
        control = <Select {...props} mode="multiple" value={Array.isArray(value) ? value : []}
          options={options} allowClear onChange={change} />
        break
      case 'CHECKBOX':
        control = <Checkbox {...props} checked={value === true} indeterminate={value == null}
          onChange={(event) => change(event.target.checked)}>
          {value == null ? '待选择' : value === true ? '是' : '否'}
        </Checkbox>
        break
      case 'TEXTAREA':
        control = <Input.TextArea {...props} value={text} rows={3}
          maxLength={field.constraints?.maxLength ?? 4000} onChange={(event) => change(event.target.value)} />
        break
      case 'DATE':
        control = <Input {...props} type="date" value={text} onChange={(event) => change(event.target.value)} />
        break
      case 'NUMBER':
        control = <Input {...props} value={text} inputMode={field.type === 'INTEGER' ? 'numeric' : 'decimal'}
          onChange={(event) => change(event.target.value)} />
        break
      case 'TEXT':
        control = <Input {...props} value={text} maxLength={field.constraints?.maxLength ?? 4000}
          onChange={(event) => change(event.target.value)} />
        break
      default:
        control = <Typography.Text type="danger">当前客户端不支持此控件。</Typography.Text>
    }
  }

  const { min, max } = field.constraints ?? {}
  const range = [min != null && `最小值 ${min}`, max != null && `最大值 ${max}`].filter(Boolean).join('，')
  const guidance = [field.description, range].filter(Boolean).join(' · ')
  return (
    <Form.Item label={field.unit ? `${field.label}（${field.unit}）` : field.label} htmlFor={readonly ? undefined : id}
      required={required && !readonly} validateStatus={issue ? 'error' : undefined} help={issue}
      extra={<>
        {guidance && <span>{guidance}</span>}
        {!submitted && schema.locked && <Typography.Text type="secondary"> 方案已锁定</Typography.Text>}
        {!readonly && reset && <Button type="link" size="small" disabled={busy} onClick={reset}>
          {schema.initialValue == null ? '清除填写' : '恢复默认值'}
        </Button>}
      </>}
    >
      {control}
    </Form.Item>
  )
}

export default function FormFields({ instance, draft, issue, busy, onSelect, onValue }: {
  instance: FormDetail
  draft: Draft
  issue?: FormIssue
  busy: boolean
  onSelect: (itemKey: string, selected: boolean) => void
  onValue: (itemKey: string, fieldKey: string, value: FieldValue | undefined) => void
}) {
  const submitted = instance.status === 'SUBMITTED'
  const items = instance.release.items
  return (
    <Form layout="vertical" component={false}>
      {items.map((item) => {
        const selected = draft.selectedItems.includes(item.itemKey)
        if (submitted && !selected) return null
        const overrides = draft.values[item.itemKey]
        return (
          <section key={item.itemKey}>
            {(!item.required && !submitted) ? (
              <Checkbox checked={selected} disabled={busy} onChange={(event) => onSelect(item.itemKey, event.target.checked)}
                style={{ marginBottom: 16 }}>
                {item.itemKey}
              </Checkbox>
            ) : items.length > 1 && <Typography.Title level={5}>{item.itemKey}</Typography.Title>}
            {selected && item.fields.map((schema, index) => {
              const key = schema.field.key
              const override = overrides?.[key]
              const value = submitted ? instance.values[item.itemKey]?.[key]?.value : override ?? schema.initialValue
              return (
                <div key={key}>
                  {schema.section && (index === 0 || schema.section !== item.fields[index - 1].section) &&
                    <Divider titlePlacement="left">{schema.section}</Divider>}
                  <FieldControl schema={schema} value={value} submitted={submitted} busy={busy}
                    issue={issue?.itemKey === item.itemKey && issue.fieldKey === key ? issue.message : undefined}
                    change={(next) => onValue(item.itemKey, key, next)}
                    reset={override === undefined ? undefined : () => onValue(item.itemKey, key, undefined)} />
                </div>
              )
            })}
          </section>
        )
      })}
    </Form>
  )
}

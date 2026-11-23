import { Input, Select } from 'antd'
import type { FieldDefinition, FieldValue } from '../../components/forms/formModel'

export default function DefaultInput({ field, value, onChange, id, disabled }: {
  field: FieldDefinition
  value?: FieldValue | null
  onChange?: (value: FieldValue | null) => void
  id?: string
  disabled?: boolean
}) {
  if (field.type === 'ENUM') {
    const options = field.options.map(({ code, label }) => ({ value: code, label }))
    if (field.multiple) return (
      <Select id={id} disabled={disabled} mode="multiple" allowClear options={options}
        placeholder="选择默认选项" value={Array.isArray(value) ? value : []} onChange={onChange} />
    )
    return <Select id={id} disabled={disabled} allowClear options={options}
      placeholder="未设置" value={typeof value === 'string' ? value : undefined}
      onChange={(next: string | undefined) => onChange?.(next ?? null)} />
  }
  if (field.type === 'BOOLEAN') return (
    <Select id={id} disabled={disabled} allowClear placeholder="未设置"
      value={typeof value === 'boolean' ? String(value) : undefined}
      options={[{ value: 'true', label: '是' }, { value: 'false', label: '否' }]}
      onChange={(next: string | undefined) => onChange?.(next == null ? null : next === 'true')} />
  )
  return <Input id={id} disabled={disabled}
    type={field.type === 'DATE' ? 'date' : 'text'}
    placeholder="未设置" value={value == null ? '' : String(value)}
    onChange={(event) => onChange?.(event.target.value)} />
}

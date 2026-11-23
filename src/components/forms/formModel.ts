import { UpmsError } from '../../utils/upms'

export type FieldType = 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'ENUM'
export type Widget = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'CHECKBOX' | 'DATE' | 'SELECT' | 'MULTI_SELECT'
type Origin = 'GROUP_DEFAULT' | 'TEMPLATE_DEFAULT' | 'GROUP_LOCKED' | 'TEMPLATE_LOCKED' | 'USER'

export type FieldValue = string | number | boolean | string[]
type Fields<T> = Record<string, Record<string, T>>

export type FieldDefinition = {
    key: string
    label: string
    description?: string | null
    type: FieldType
    multiple: boolean
    valueSetCode?: string | null
    unit?: string | null
    options: { code: string; label: string }[]
    constraints?: { min?: string | null; max?: string | null; maxLength?: number | null } | null
}

export type FormField = {
  field: FieldDefinition
  widget: Widget
  section?: string | null
  required: boolean
  locked: boolean
  initialValue?: FieldValue | null
}

export type FormItem = { itemKey: string; required: boolean; defaultSelected: boolean; fields: FormField[] }
export type FormRelease = { id: string | null; code: string; version: number; items: FormItem[] }
export type FormDetail = {
  id: string
  release: FormRelease
  status: 'DRAFT' | 'SUBMITTED'
  rowVersion: number
  selectedItems: string[]
  values: Fields<{ value: FieldValue; origin: Origin }>
}

export type Draft = {
  selectedItems: string[]
  values: Fields<FieldValue>
}

export function fromInstance(instance: FormDetail): Draft {
  return {
    selectedItems: instance.selectedItems,
    values: Object.fromEntries(Object.entries(instance.values).flatMap(([item, fields]) => {
      const overrides = Object.entries(fields)
        .filter(([, entry]) => entry.origin === 'USER')
        .map(([key, entry]) => [key, entry.value] as const)
      return overrides.length ? [[item, Object.fromEntries(overrides)]] : []
    })),
  }
}

export type FormIssue = { message: string; itemKey?: string; fieldKey?: string }

export class FieldIssue extends Error {
  constructor(readonly issue: FormIssue) {
    super(issue.message)
  }
}

export function valueForWire(type: FieldType, input?: FieldValue | null) {
  if (input == null || input === '' || (Array.isArray(input) && !input.length)) return undefined
  if (type === 'INTEGER') {
    const text = String(input).trim()
    const value = Number(text)
    if (!/^-?\d+$/.test(text) || !Number.isSafeInteger(value)) throw new Error('请输入有效的整数。')
    return value
  }
  if (type === 'DECIMAL') {
    const text = String(input).trim()
    if (!/^-?\d{1,64}(\.\d{1,64})?$/.test(text)) throw new Error('请输入有效的小数。')
    return text
  }
  return type === 'TEXT' && typeof input === 'string' && !input.trim() ? undefined : input
}

export function changeDraftValue(draft: Draft, itemKey: string, fieldKey: string, value?: FieldValue): Draft {
  const fields = { ...draft.values[itemKey] }
  if (value === undefined) delete fields[fieldKey]
  else fields[fieldKey] = value
  return { ...draft, values: { ...draft.values, [itemKey]: fields } }
}

export function changeDraftSelection(draft: Draft, itemKey: string, selected: boolean): Draft {
  const values = { ...draft.values }
  if (!selected) delete values[itemKey]
  const selectedItems = draft.selectedItems.filter((key) => key !== itemKey)
  if (selected) selectedItems.push(itemKey)
  return { values, selectedItems }
}

export function toDraftRequest(instance: FormDetail, draft: Draft) {
  const selected = new Set(draft.selectedItems)
  const selectedItems: string[] = []
  const values: Fields<FieldValue> = {}
  for (const item of instance.release.items) {
    if (!selected.has(item.itemKey)) continue
    selectedItems.push(item.itemKey)
    const overrides = draft.values[item.itemKey]
    if (!overrides) continue
    const inputs: Record<string, FieldValue> = {}
    for (const schema of item.fields) {
      const { field } = schema
      const input = overrides[field.key]
      if (schema.locked) continue
      try {
        const value = valueForWire(field.type, input)
        if (value !== undefined) inputs[field.key] = value
      } catch (error) {
        if (!(error instanceof Error)) throw error
        throw new FieldIssue({ message: error.message, itemKey: item.itemKey, fieldKey: field.key })
      }
    }
    if (Object.keys(inputs).length) values[item.itemKey] = inputs
  }
  return { instanceId: instance.id, expectedRowVersion: instance.rowVersion, selectedItems, values }
}

const errorMessages: Record<string, string> = {
  FORM_CONFLICT: '表单已变更，请重新载入最新版本后继续。',
  FORM_INVALID_STATE: '当前表单状态已变更，请重新载入。',
  FORM_REQUIRED_FIELD: '请填写此字段。',
  FORM_LOCKED_FIELD: '此字段已锁定。',
  FORM_INVALID_VALUE: '请检查字段格式和可填范围。',
  FORM_INVALID_SELECTION: '请选择符合表单要求的项目。',
  FORM_NOT_FOUND: '未找到该实例或发布版本，请检查编号和访问权限。',
}

export function formIssue(error: unknown): FormIssue {
  if (error instanceof FieldIssue) return error.issue
  if (error instanceof UpmsError) {
    const details = error.details
    const location = details && typeof details === 'object' ? details : {}
    return {
      message: errorMessages[error.code] ?? error.message,
      itemKey: 'itemKey' in location && typeof location.itemKey === 'string' ? location.itemKey : undefined,
      fieldKey: 'fieldKey' in location && typeof location.fieldKey === 'string' ? location.fieldKey : undefined,
    }
  }
  return { message: error instanceof Error ? error.message : '操作失败，请重试。' }
}

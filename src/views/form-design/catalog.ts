import type {FieldDefinition, FieldType, FieldValue, Widget} from '../../components/forms/formModel'
import {formIssue} from '../../components/forms/formModel'
import {UpmsError} from '../../utils/upms'

export type FieldVersion = { id: string; version: number; systemOwned: boolean; field: FieldDefinition }
export type Placement = {
    fieldVersionId: string
    section?: string | null
    widget: Widget
    required: boolean
    locked: boolean
    templateOverrideAllowed: boolean
    initialValue?: FieldValue | null
}
export type Rule = {
    required: boolean
    locked: boolean
    allowedOptions?: string[] | null
    initialValue?: FieldValue | null
}
export type Item = {
    itemKey: string
    groupVersionId: string
    required: boolean
    defaultSelected: boolean
    rules?: Record<string, Rule> | null
}
export type Group = { fields: Placement[] }
export type Template = { items: Item[] }
export type Definition = Group | Template
export type Kind = 'groups' | 'templates'
export type Version<T extends Definition = Definition> = {
    id: string
    code: string
    version: number
    rowVersion: number
    status: 'DRAFT' | 'PUBLISHED' | 'RETIRED'
    definition: T
}

export const CODE = /^[A-Z][A-Z0-9_]{0,63}$/
export const ITEM_KEY = /^[A-Z][A-Z0-9_]{0,63}(\.[A-Z][A-Z0-9_]{0,63})*$/
export const codeRule = {required: true, pattern: CODE, message: '请输入大写字母开头的编码，可包含数字和下划线。'}
export const versionRule = {
    required: true,
    type: 'integer' as const,
    min: 1,
    max: 2147483647,
    message: '请输入正整数版本号。'
}

export const fieldTypes: Record<FieldType, string> = {
    TEXT: '文本', INTEGER: '整数', DECIMAL: '小数', BOOLEAN: '布尔', DATE: '日期', ENUM: '枚举',
}
export const widgetNames: Record<Widget, string> = {
    TEXT: '单行输入', TEXTAREA: '多行输入', NUMBER: '数字输入', CHECKBOX: '复选框',
    DATE: '日期选择', SELECT: '单选下拉框', MULTI_SELECT: '多选下拉框',
}

export function widgets(field: FieldDefinition): Widget[] {
    switch (field.type) {
        case 'TEXT':
            return ['TEXT', 'TEXTAREA']
        case 'INTEGER':
        case 'DECIMAL':
            return ['NUMBER']
        case 'DATE':
            return ['DATE']
        case 'BOOLEAN':
            return ['CHECKBOX']
        case 'ENUM':
            return [field.multiple ? 'MULTI_SELECT' : 'SELECT']
    }
}

export function designError(error: unknown) {
    const issue = formIssue(error)
    if (error instanceof UpmsError && error.code === 'FORM_INVALID_DEFINITION'
        && error.details && typeof error.details === 'object'
        && 'reason' in error.details && typeof error.details.reason === 'string') {
        return `配置校验失败（${error.details.reason}）`
    }
    return [issue.itemKey, issue.fieldKey, issue.message].filter(Boolean).join(' · ')
}

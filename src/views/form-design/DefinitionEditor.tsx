import {Alert, Button, Drawer, Flex, Form, Input, InputNumber, Skeleton} from 'antd'
import {useState} from 'react'
import {valueForWire} from '../../components/forms/formModel'
import {useUpms} from '../../utils/useUpms'
import {
    codeRule,
    designError,
    versionRule,
    type FieldVersion,
    type Group,
    type Kind,
    type Template,
    type Version
} from './catalog'
import {useReferences} from './catalogData'
import {GroupLayout, TemplateLayout, type EditorValues} from './LayoutEditor'

export type EditorTarget = { mode: 'create' | 'edit' | 'copy' | 'view'; version?: Version }

function buildGroup(values: EditorValues, fields: FieldVersion[]): Group {
    const byId = new Map(fields.map((version) => [version.id, version.field]))
    return {
        fields: (values.fields ?? []).map((placement) => {
            const field = byId.get(placement.fieldVersionId)
            if (!field) throw new Error('请选择有效的字段版本。')
            const initialValue = valueForWire(field.type, placement.initialValue)
            if (placement.locked && initialValue === undefined) throw new Error(`${field.label}锁定前须设置默认值。`)
            return {
                ...placement,
                section: placement.section?.trim() || null,
                initialValue,
                locked: Boolean(placement.locked),
                required: Boolean(placement.required),
                templateOverrideAllowed: !placement.locked && Boolean(placement.templateOverrideAllowed)
            }
        })
    }
}

function buildTemplate(values: EditorValues, fields: FieldVersion[], groups: Version<Group>[]): Template {
    const byId = new Map(fields.map((version) => [version.id, version.field]))
    const groupsById = new Map(groups.map((group) => [group.id, group]))
    return {
        items: (values.items ?? []).map((item) => {
            const group = groupsById.get(item.groupVersionId)
            if (!group || group.status !== 'PUBLISHED') throw new Error('请选择已发布的字段组版本。')
            const allowed = new Map(group.definition.fields.flatMap((placement) => {
                const field = byId.get(placement.fieldVersionId)
                return field && placement.templateOverrideAllowed && !placement.locked ? [[field.key, field] as const] : []
            }))
            const rules = Object.fromEntries(Object.entries(item.rules ?? {}).map(([key, rule]) => {
                const field = allowed.get(key)
                if (!field) throw new Error(`${item.itemKey} 的字段 ${key} 未开放覆盖。`)
                return [key, {...rule, initialValue: valueForWire(field.type, rule.initialValue)}]
            }))
            return {
                ...item,
                required: Boolean(item.required),
                defaultSelected: Boolean(item.required || item.defaultSelected),
                rules
            }
        })
    }
}

export default function DefinitionEditor({path, kind, target, onClose, onSaved}: {
    path: string
    kind: Kind
    target: EditorTarget
    onClose: () => void
    onSaved: () => void
}) {
    const [form] = Form.useForm<EditorValues>()
    const request = useUpms()
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const withGroups = kind === 'templates'
    const references = useReferences(path, withGroups)
    const source = target.version
    const readonly = target.mode === 'view'
    const originalIdentity = target.mode === 'edit' || readonly
    const name = withGroups ? '表单模板' : '字段组'
    const initialValues: EditorValues = {
        code: source?.code ?? '',
        version: source ? (target.mode === 'copy' ? Math.min(source.version + 1, 2147483647) : source.version) : 1,
        ...source?.definition,
        ...(!source && withGroups && {
            items: [{itemKey: 'ROOT', groupVersionId: '', required: true, defaultSelected: true}],
        }),
    }

    async function save(values: EditorValues) {
        if (saving || readonly) return
        setSaving(true)
        setError('')
        try {
            const definition = withGroups ? buildTemplate(values, references.fields, references.groups)
                : buildGroup(values, references.fields)
            await request(`${path}/${kind}`, {
                code: values.code, version: values.version,
                expectedRowVersion: target.mode === 'edit' ? source?.rowVersion : undefined,
                definition,
            }, 'PUT')
            onSaved()
        } catch (failure) {
            setError(designError(failure))
        } finally {
            setSaving(false)
        }
    }

    const title = {
        create: `新建${name}`,
        edit: `编辑${name}草稿`,
        copy: `新建${name}版本`,
        view: `查看${name}`
    }[target.mode]
    return (
        <Drawer open title={title} size={760} onClose={saving ? undefined : onClose} closable={!saving}
                mask={{closable: !saving}} keyboard={!saving}
                extra={<Flex gap="small">
                    <Button disabled={saving} onClick={onClose}>{readonly ? '关闭' : '取消'}</Button>
                    {!readonly && <Button type="primary" loading={saving}
                                          disabled={references.loading || Boolean(references.error)}
                                          onClick={() => form.submit()}>保存草稿</Button>}
                </Flex>}>
            {(references.error || error) && <Alert type="error" showIcon title={references.error || error}
                                                   style={{marginBottom: 16}}/>}
            {references.loading ? <Skeleton active/> : !references.error && (
                <Form<EditorValues> form={form} layout="vertical" initialValues={initialValues}
                                    disabled={readonly || saving}
                                    onFinish={(values) => void save(values)}>
                    <Flex gap="middle" wrap>
                        <Form.Item name="code" label={`${name}编码`} rules={[codeRule]}
                                   style={{flex: 1, minWidth: 200}}>
                            <Input disabled={originalIdentity} maxLength={64}/>
                        </Form.Item>
                        <Form.Item name="version" label="版本" rules={[versionRule]}>
                            <InputNumber disabled={originalIdentity} min={1} precision={0}/>
                        </Form.Item>
                    </Flex>
                    {withGroups ? <TemplateLayout form={form} fields={references.fields} groups={references.groups}
                                                  disabled={readonly || saving}/>
                        : <GroupLayout form={form} fields={references.fields} disabled={readonly || saving}/>}
                </Form>
            )}
        </Drawer>
    )
}

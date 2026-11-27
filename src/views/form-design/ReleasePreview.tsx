import {Button, Drawer, Flex, Tag, Typography} from 'antd'
import {useState} from 'react'
import FormFields from '../../components/forms/FormFields'
import {
    changeDraftSelection,
    changeDraftValue,
    type Draft,
    type FormDetail,
    type FormRelease
} from '../../components/forms/formModel'

export default function ReleasePreview({release, onClose}: { release: FormRelease; onClose: () => void }) {
    const [draft, setDraft] = useState<Draft>(() => ({
        selectedItems: release.items.filter((item) => item.defaultSelected || item.required).map((item) => item.itemKey),
        values: {},
    }))
    const instance: FormDetail = {
        id: '', release, status: 'DRAFT', rowVersion: 0, selectedItems: [], values: {},
    }
    return (
        <Drawer open title={`预览 ${release.code} · V${release.version}`} size={650} onClose={onClose}
                extra={<Button onClick={onClose}>关闭</Button>}>
            {release.id && <Flex wrap align="center" gap="small" style={{marginBottom: 20}}>
                <Tag color="success">已生成发布版本</Tag>
                <Typography.Text copyable={{text: release.id}}>发布 ID {release.id}</Typography.Text>
            </Flex>}
            <FormFields instance={instance} draft={draft} busy={false}
                        onSelect={(itemKey, selected) => setDraft((current) => changeDraftSelection(current, itemKey, selected))}
                        onValue={(itemKey, key, value) => setDraft((current) => changeDraftValue(current, itemKey, key, value))}/>
        </Drawer>
    )
}

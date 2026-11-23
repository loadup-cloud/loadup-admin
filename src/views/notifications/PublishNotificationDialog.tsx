import { App, Form, Input } from 'antd'
import { useRef } from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import UpmsUserSelect from '../../components/common/UpmsUserSelect'
import { isNotificationActionPath } from '../../utils/notifications'
import { useUpms } from '../../utils/useUpms'

type PublishFields = { recipients: string[]; category: string; title: string; body: string; actionUrl?: string }

const maxRecipients = 100

export default function PublishNotificationDialog({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const request = useUpms()
  const { message } = App.useApp()
  const requestKeys = useRef(new Map<string, string>())

  async function publish(fields: PublishFields) {
    const notification = {
      recipients: [...fields.recipients].sort(),
      category: fields.category.trim(), title: fields.title.trim(), body: fields.body.trim(),
      actionUrl: fields.actionUrl?.trim() || undefined,
    }
    const signature = JSON.stringify(notification)
    let requestKey = requestKeys.current.get(signature)
    if (!requestKey) {
      // A retry of the same submission must reuse its backend idempotency key.
      const bytes = window.crypto.getRandomValues(new Uint8Array(16))
      requestKey = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
      requestKeys.current.set(signature, requestKey)
    }
    const { data } = await request<{ delivered: number }>('/notifications/publish', { ...notification, requestKey })
    if (!data) throw new Error('未收到发布结果，请重试。')
    void message.success(data.delivered ? `已发布给 ${data.delivered} 位收件人` : '通知已发布')
    onPublished()
  }

  return (
    <UpmsFormDialog<PublishFields> title="发布通知" okText="发布" onSave={publish} onClose={onClose}>
      <Form.Item name="recipients" label="收件人" rules={[{
        required: true, type: 'array', min: 1, max: maxRecipients, message: '请选择 1 至 100 位收件人',
      }]}>
        <UpmsUserSelect mode="multiple" maxCount={maxRecipients} label="收件人" placeholder="搜索账号或昵称，可多选" />
      </Form.Item>
      <Form.Item name="category" label="类别" rules={[{ required: true, whitespace: true, message: '请输入类别' }]}>
        <Input maxLength={64} />
      </Form.Item>
      <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: '请输入标题' }]}>
        <Input maxLength={200} />
      </Form.Item>
      <Form.Item name="body" label="正文" rules={[{ required: true, whitespace: true, message: '请输入正文' }]}>
        <Input.TextArea rows={4} maxLength={4000} showCount />
      </Form.Item>
      <Form.Item name="actionUrl" label="跳转地址" extra="选填，填写以 / 开头的站内路径。" rules={[{
        validator: async (_, value?: string) => {
          const path = value?.trim()
          if (path && !isNotificationActionPath(path)) throw new Error('请输入有效的站内路径，例如 /account/security。')
        },
      }]}>
        <Input placeholder="/account/security" maxLength={500} />
      </Form.Item>
    </UpmsFormDialog>
  )
}

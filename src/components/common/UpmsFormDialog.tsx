import { Alert, Form, Modal } from 'antd'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { upmsErrorText } from '../../utils/useUpms'

export default function UpmsFormDialog<T extends object>({ title, initialValues, onSave, onClose, children }: {
  title: string
  initialValues?: Partial<T>
  onSave: (values: T) => Promise<void>
  onClose: () => void
  children: ReactNode
}) {
  const [form] = Form.useForm<T>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(values: T) {
    if (pending) return
    setPending(true)
    setError('')
    try {
      await onSave(values)
      onClose()
    } catch (failure) {
      setError(upmsErrorText(failure))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open
      title={title}
      okText="保存"
      confirmLoading={pending}
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: false }}
      cancelButtonProps={{ disabled: pending }}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form<T> form={form} layout="vertical" initialValues={initialValues} onFinish={submit}>
        {children}
      </Form>
      {error && <Alert type="error" showIcon title={error} />}
    </Modal>
  )
}

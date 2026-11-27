import { Alert, App, Button, Card, Form, Input, Space, Typography } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NewPasswordFields from '../../../components/auth/NewPasswordFields'
import { usePasswordPolicy } from '../../../components/auth/usePasswordPolicy'
import { isPasswordPolicyError, resetPassword, sendPasswordResetCode, type ResetPasswordFields } from '../../../utils/upms'
import { upmsErrorText } from '../../../utils/useUpms'

type ResetForm = ResetPasswordFields & { email: string }

export default function PasswordResetPage() {
  const [form] = Form.useForm<ResetForm>()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const policy = usePasswordPolicy()
  const { message } = App.useApp()
  const navigate = useNavigate()

  async function sendCode() {
    const values = await form.validateFields(['email']).catch(() => undefined)
    if (!values?.email) return
    setSending(true)
    setError('')
    setSent(false)
    try {
      await sendPasswordResetCode(values.email)
      setSent(true)
    } catch (failure) {
      setError(upmsErrorText(failure))
    } finally {
      setSending(false)
    }
  }

  async function submit({ username, verificationCode, newPassword, confirmPassword }: ResetForm) {
    setSubmitting(true)
    setError('')
    try {
      await resetPassword({ username, verificationCode, newPassword, confirmPassword })
      void message.success('密码已重置，请使用新密码登录。')
      navigate('/auth/login', { replace: true })
    } catch (failure) {
      if (isPasswordPolicyError(failure)) policy.reload()
      setError(upmsErrorText(failure))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 440 }}>
        <Typography.Title level={2}>重置密码</Typography.Title>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="username" label="账号" rules={[{ required: true, whitespace: true }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="email" label="已验证的邮箱" rules={[
            { required: true, message: '请输入已验证的邮箱' },
            { type: 'email', max: 100, transform: (value: string) => value?.trim(), message: '请输入有效邮箱' },
          ]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item label="邮箱验证码">
            <Space.Compact block>
              <Form.Item name="verificationCode" noStyle rules={[
                { required: true, pattern: /^[0-9]{6}$/, message: '请输入 6 位验证码' },
              ]}>
                <Input aria-label="邮箱验证码" autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
              </Form.Item>
              <Button loading={sending} disabled={submitting} onClick={() => void sendCode()}>获取验证码</Button>
            </Space.Compact>
          </Form.Item>
          {sent && <Alert type="info" showIcon title="如果邮箱已验证且可用于重置，请查收验证码。" style={{ marginBottom: 16 }} />}
          <NewPasswordFields {...policy} />
          {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" loading={submitting} disabled={!policy.policy || sending} block>
            重置密码
          </Button>
        </Form>
        <Link to="/auth/login" style={{ display: 'inline-block', marginTop: 16 }}>返回登录</Link>
      </Card>
    </div>
  )
}

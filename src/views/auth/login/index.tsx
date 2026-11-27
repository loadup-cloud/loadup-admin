import React, { useState, useMemo } from 'react'
import { App, Form, Input, Button, Card, Typography, Space, theme } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import AccountHome from '../../../components/auth/AccountHome'
import useUserStore from '../../../store/user'
import { login as loginToUpms, type LoginCredentials } from '../../../utils/upms'

const { Title, Text } = Typography

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const login = useUserStore((state) => state.login)
  const session = useUserStore((state) => state.session)
  const { message } = App.useApp()
  const { token } = theme.useToken()

  const toRgba = (color: string, alpha: number) => {
    if (!color) return `rgba(0,0,0,${alpha})`
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
    }
    let hex = color.replace('#', '')
    if (hex.length === 3) {
      hex = hex.split('').map((char) => char + char).join('')
    }
    const bigint = parseInt(hex, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const backgroundStyle = useMemo(() => ({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: token.colorBgLayout,
    backgroundImage: `
      radial-gradient(circle at 15% 20%, ${toRgba(token.colorPrimary, 0.18)}, transparent 55%),
      radial-gradient(circle at 85% 10%, ${toRgba(token.green8, 0.16)}, transparent 50%),
      linear-gradient(0deg, ${toRgba(token.colorSplit, 0.8)} 1px, transparent 1px),
      linear-gradient(90deg, ${toRgba(token.colorSplit, 0.6)} 1px, transparent 1px)
    `,
    backgroundSize: 'auto, auto, 32px 32px, 32px 32px',
    backgroundAttachment: 'fixed'
  }), [token])

  const onFinish = async (values: LoginCredentials) => {
    setLoading(true)
    try {
      login(await loginToUpms(values))
    } catch (error: unknown) {
      void message.error(error instanceof Error ? error.message : '登录失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  if (session) return <AccountHome />

  return (
    <div style={backgroundStyle}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>登录 LoadUp Admin</Title>
            <Text type="secondary">使用你的 UPMS 账号登录</Text>
          </div>

          <Form<LoginCredentials>
            name="login"
            onFinish={onFinish}
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, whitespace: true, message: '请输入账号' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                aria-label="账号"
                autoComplete="username"
                placeholder="账号"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                aria-label="密码"
                autoComplete="current-password"
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                登录
              </Button>
            </Form.Item>
            <Link to="/auth/password-reset">忘记密码？</Link>
          </Form>

        </Space>
      </Card>
    </div>
  )
}

export default LoginPage


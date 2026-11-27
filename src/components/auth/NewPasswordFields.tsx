import { Button, Form, Input } from 'antd'
import type { PasswordCharacterClass } from '../../utils/upms'
import type { usePasswordPolicy } from './usePasswordPolicy'

// Java String.isBlank also treats U+001C through U+001F as whitespace.
// eslint-disable-next-line no-control-regex
const blank = /^[\t-\r\u001c-\u001f\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]*$/u

const classes: Record<PasswordCharacterClass, { label: string; matches: RegExp }> = {
  UPPERCASE: { label: '大写字母', matches: /\p{Lu}/u },
  LOWERCASE: { label: '小写字母', matches: /\p{Ll}/u },
  DIGIT: { label: '数字', matches: /\p{Nd}/u },
  SYMBOL: { label: '标点或符号', matches: /[\p{P}\p{S}]/u },
}

export default function NewPasswordFields({ policy, error, reload }: ReturnType<typeof usePasswordPolicy>) {
  const required = policy?.requiredCharacterClasses.map((kind) => classes[kind]) ?? []
  const requirements = policy
    ? `至少 ${policy.minCharacters} 个字符，UTF-8 编码最多 ${policy.maxUtf8Bytes} 字节${required.length
      ? `，须包含${required.map(({ label }) => label).join('、')}`
      : ''}。`
    : ''

  return (
    <>
      <Form.Item name="newPassword" label="新密码"
        extra={policy ? requirements : error
          ? <>{error} <Button type="link" size="small" onClick={reload}>重新加载密码要求</Button></>
          : '正在加载密码要求…'}
        rules={[{ required: true, message: '请输入新密码' }, {
          validator: async (_, value?: string) => {
            if (!value) return
            if (!policy) throw new Error('请先加载密码要求。')
            if (blank.test(value) || Array.from(value).length < policy.minCharacters
                || new TextEncoder().encode(value).length > policy.maxUtf8Bytes
                || required.some(({ matches }) => !matches.test(value))) {
              throw new Error(requirements)
            }
          },
        }]}>
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="confirmPassword" label="确认新密码" dependencies={['newPassword']}
        rules={[{ required: true, message: '请确认新密码' }, ({ getFieldValue }) => ({
          validator: async (_, value?: string) => {
            if (value && getFieldValue('newPassword') !== value) throw new Error('两次输入的新密码不一致。')
          },
        })]}>
        <Input.Password autoComplete="new-password" />
      </Form.Item>
    </>
  )
}

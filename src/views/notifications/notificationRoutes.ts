export const notificationChannels = {
  IN_APP: { label: '站内信', recipients: '站内用户', placeholder: '搜索账号或昵称' },
  EMAIL: { label: '邮件', recipients: '邮箱地址', placeholder: '输入邮箱地址，按 Enter 添加' },
  SMS: { label: '短信', recipients: '手机号码', placeholder: '输入国际格式号码，按 Enter 添加' },
  PUSH: { label: '推送', recipients: '设备令牌', placeholder: '输入设备令牌，按 Enter 添加' },
  WEBHOOK: { label: 'Webhook', recipients: '', placeholder: '' },
} as const

export type NotificationChannel = keyof typeof notificationChannels
export type Template = { channel: NotificationChannel; fields: Record<string, string> }
export type NotificationRoute = {
  serviceCode: string; name: string; description?: string; enabled: boolean; version: number
  requiredParameters: string[]; channels: Template[]
}
export type Account = {
  accountCode: string; channel: Exclude<NotificationChannel, 'IN_APP'>; adapter: string; enabled: boolean
  priority: number; secretRef?: string; connectTimeoutMs: number; requestTimeoutMs: number; version: number
  settings: Record<string, string>
}
export type Receipt = { requestId: string; serviceCode: string; revision: number; acceptedAt: string; targetCount: number }
export type Attempt = {
  number: number; accountCode?: string; configVersion?: number; status: string; reason?: string
  remoteId?: string; startedAt: string; finishedAt?: string
}
export type Delivery = { id: string; channel: NotificationChannel; target: string; status: string; attempts: Attempt[] }
export type GotoneRequest = { receipt: Receipt; deliveries: Delivery[] }

export const notificationChannelOptions = Object.entries(notificationChannels).map(([value, channel]) => ({
  value, label: channel.label,
}))

export function withoutEmpty(fields: Record<string, string | undefined> = {}) {
  return Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim())))
}

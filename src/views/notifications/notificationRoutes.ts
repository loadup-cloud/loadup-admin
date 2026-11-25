export const notificationChannels = {
  IN_APP: { label: '站内信', recipients: '站内用户', placeholder: '搜索账号或昵称' },
  EMAIL: { label: '邮件', recipients: '邮箱地址', placeholder: '输入邮箱地址，按 Enter 添加' },
  SMS: { label: '短信', recipients: '手机号码', placeholder: '输入号码，按 Enter 添加' },
  PUSH: { label: '推送', recipients: '设备令牌', placeholder: '输入设备令牌，按 Enter 添加' },
} as const

export type NotificationChannel = keyof typeof notificationChannels
export type NotificationRoute = { serviceCode: string; channels: NotificationChannel[] }

export const notificationChannelOptions = Object.entries(notificationChannels).map(([value, channel]) => ({
  value, label: channel.label,
}))

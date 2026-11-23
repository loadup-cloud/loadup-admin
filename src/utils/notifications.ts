export type InboxNotification = {
  id: string
  senderId?: string | null
  category: string
  title: string
  body: string
  actionUrl?: string | null
  readAt?: string | null
  createdAt: string
}

export function isNotificationActionPath(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || (code >= 127 && code <= 159)
    })
}

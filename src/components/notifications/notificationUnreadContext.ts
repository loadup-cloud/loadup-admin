import { createContext, useContext } from 'react'
import type { useUpmsData } from '../../utils/useUpms'

export const NotificationUnreadContext = createContext<ReturnType<typeof useUpmsData<{ count: number }>> | null>(null)

export function useNotificationUnread() {
  const unread = useContext(NotificationUnreadContext)
  if (!unread) throw new Error('Notification unread state requires a provider.')
  return unread
}

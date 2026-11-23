import type { ReactNode } from 'react'
import { useUpmsData } from '../../utils/useUpms'
import { NotificationUnreadContext } from './notificationUnreadContext'

export default function NotificationUnreadProvider({ children }: { children: ReactNode }) {
  const unread = useUpmsData<{ count: number }>('/notifications/unread-count')
  return <NotificationUnreadContext.Provider value={unread}>{children}</NotificationUnreadContext.Provider>
}

import { create } from 'zustand'
import { readSession, saveSession, type Session } from '../utils/upms'

export interface User {
  id: string | number
  username: string
  email: string
  avatar?: string
  fullName?: string
  title?: string
  department?: string
  phone?: string
  location?: string
  timezone?: string
  language?: string
  bio?: string
  emailNotifications?: boolean
  productUpdates?: boolean
  twoFactorEnabled?: boolean
  [key: string]: unknown
}

interface UserState {
  session: Session | null
  user: User | null
  token: string | null
}

interface UserActions {
  login: (session: Session) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

const sessionState = (session: Session | null): UserState => ({
  session,
  user: session ? { id: session.userId, username: session.username, email: '' } : null,
  token: session?.accessToken ?? null,
})

const useUserStore = create<UserState & UserActions>()((set) => ({
  ...sessionState(readSession()),
  login: (session) => {
    saveSession(session)
    set(sessionState(session))
  },
  logout: () => {
    saveSession(null)
    set(sessionState(null))
  },
  updateUser: (updatedUser) => {
    set((state) => ({ user: state.user ? { ...state.user, ...updatedUser } : null }))
  },
}))

export default useUserStore

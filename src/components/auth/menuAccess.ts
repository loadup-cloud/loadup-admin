import { createContext, useContext } from 'react'
import type { Permission } from '../../utils/upmsModels'

export type MenuAccess = {
  status: 'loading' | 'ready' | 'error'
  entries: Permission[]
  paths: ReadonlySet<string>
  retry: () => void
}

export const MenuAccessContext = createContext<MenuAccess>({
  status: 'loading',
  entries: [],
  paths: new Set(),
  retry: () => {},
})

export function useMenuAccess() {
  return useContext(MenuAccessContext)
}

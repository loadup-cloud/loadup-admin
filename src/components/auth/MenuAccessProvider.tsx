import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { isSuperAdmin, requestUpms, type Session } from '../../utils/upms'
import type { Permission } from '../../utils/upmsModels'
import { MenuAccessContext, type MenuAccess } from './menuAccess'

function visibleMenus(entries: Permission[], paths: Set<string>): Permission[] {
  return entries.flatMap((entry) => {
    if (entry.permissionType !== 1 || entry.status !== 1 || entry.visible !== true) return []
    if (entry.resourcePath) paths.add(entry.resourcePath)
    return [{ ...entry, children: visibleMenus(entry.children ?? [], paths) }]
  })
}

export default function MenuAccessProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; entries: Permission[] | null }>()
  const status = result?.attempt !== attempt ? 'loading' : result.entries ? 'ready' : 'error'

  useEffect(() => {
    let active = true
    const endpoint = isSuperAdmin(session) ? '/tree' : '/user-menu'
    void requestUpms<Permission[]>(session, `/upms/permission${endpoint}`).then(({ data }) => {
      if (active) setResult({ attempt, entries: Array.isArray(data) ? data : null })
    }).catch(() => {
      if (active) setResult({ attempt, entries: null })
    })
    return () => { active = false }
  }, [session, attempt])

  const access = useMemo<MenuAccess>(() => {
    const paths = new Set<string>()
    const entries = visibleMenus(status === 'ready' ? result?.entries ?? [] : [], paths)
    return { status, entries, paths, retry: () => setAttempt((count) => count + 1) }
  }, [status, result])

  return <MenuAccessContext.Provider value={access}>{children}</MenuAccessContext.Provider>
}

type Envelope<T> = {
  result: { code: string; status: string; message?: string }
  data: T | null
  pageInfo?: { totalCount: number }
}

export type Session = {
  accessToken: string
  userId: string
  username: string
  roles: string[]
  expiresAt: number
}

export type LoginCredentials = { username: string; password: string }

export type UpmsUser = {
  id: string
  username: string
  nickname?: string | null
  deptName?: string | null
  email?: string | null
  mobile?: string | null
  status?: number | null
  roles?: { id: string; roleName: string; roleCode: string }[] | null
  lastLoginTime?: string | null
}

export type AccountAction = 'lock' | 'unlock'

export class UpmsError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

const errorMessages: Record<string, string> = {
  UNAUTHENTICATED: '登录凭据无效或会话已过期。',
  ACCESS_DENIED: '当前账号没有执行此操作的权限。',
  PARAM_ILLEGAL: '请检查输入内容。',
  USER_NOT_FOUND: '该用户已不存在，请刷新列表。',
  DEPLOYMENT_CODE_REQUIRED: 'UPMS 要求提供部署代码。',
  DEPLOYMENT_CODE_INVALID: '部署代码格式不正确。',
  DEPLOYMENT_CODE_MISMATCH: '部署代码与当前 UPMS 实例不匹配。',
}

async function post<T>(path: string, body: unknown, accessToken?: string): Promise<Envelope<T>> {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Tenant-Code': import.meta.env.VITE_LOADUP_TENANT_CODE || 'local',
  })
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch {
    throw new UpmsError('NETWORK_ERROR', '无法连接 UPMS，请确认服务已启动。')
  }
  const payload: Envelope<T> | null = await response.json().catch(() => null)
  if (!response.ok || payload?.result?.status !== 'S') {
    const code = response.status === 401 ? 'UNAUTHENTICATED'
      : response.status === 403 ? 'ACCESS_DENIED'
        : payload?.result?.code || 'INVALID_RESPONSE'
    throw new UpmsError(
      code,
      errorMessages[code] || payload?.result?.message || `UPMS 返回异常响应（HTTP ${response.status}）。`,
    )
  }
  return payload
}

const sessionKey = 'loadup-admin.access-token'

function parseSession(accessToken: string): Session {
  try {
    const encoded = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
    const { exp, sub, username, roles } = JSON.parse(new TextDecoder().decode(bytes))
    if (
      !Number.isFinite(exp) ||
      typeof sub !== 'string' ||
      typeof username !== 'string' ||
      !Array.isArray(roles) ||
      roles.some((role) => typeof role !== 'string')
    ) {
      throw new Error('Invalid UPMS token claims')
    }
    return { accessToken, expiresAt: exp * 1000, userId: sub, username, roles }
  } catch {
    throw new UpmsError('INVALID_TOKEN', 'UPMS 返回的登录令牌无法读取。')
  }
}

export function readSession(): Session | null {
  const token = sessionStorage.getItem(sessionKey)
  if (!token) return null
  try {
    const session = parseSession(token)
    if (session.expiresAt > Date.now()) return session
  } catch {
    // Discard a stored token that UPMS cannot use.
  }
  sessionStorage.removeItem(sessionKey)
  return null
}

export function saveSession(session: Session | null) {
  if (session) {
    sessionStorage.setItem(sessionKey, session.accessToken)
  } else {
    sessionStorage.removeItem(sessionKey)
  }
}

export function canManageUsers(session: Session | null) {
  return session?.roles.some((role) => role === 'SUPER_ADMIN' || role === 'ROLE_SUPER_ADMIN') ?? false
}

export async function login(credentials: LoginCredentials): Promise<Session> {
  const { data } = await post<{ accessToken: string }>('/auth/login', {
    username: credentials.username.trim(),
    password: credentials.password,
  })
  if (!data?.accessToken) throw new UpmsError('INVALID_TOKEN', 'UPMS 未返回登录令牌。')
  const session = parseSession(data.accessToken)
  if (session.expiresAt <= Date.now()) throw new UpmsError('UNAUTHENTICATED', '登录令牌已过期。')
  return session
}

export async function listUsers(
  session: Session,
  options: { page: number; size: number; keyword?: string },
) {
  const { data, pageInfo } = await post<UpmsUser[]>(
    '/upms/user/list',
    { page: options.page, size: options.size, username: options.keyword?.trim() || undefined },
    session.accessToken,
  )
  if (!Array.isArray(data) || !pageInfo || !Number.isFinite(pageInfo.totalCount)) {
    throw new UpmsError('INVALID_RESPONSE', 'UPMS 返回的用户列表格式异常。')
  }
  return { data, total: pageInfo.totalCount, success: true }
}

export async function changeAccountLock(session: Session, action: AccountAction, id: string) {
  await post<void>(`/upms/user/${action}`, { id }, session.accessToken)
}

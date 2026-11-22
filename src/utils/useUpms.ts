import { App } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import useUserStore from '../store/user'
import { requestUpms, requestUpmsBlob, UpmsError, type Session } from './upms'

function useAuthorizedCall() {
  const session = useUserStore((state) => state.session)
  const { message } = App.useApp()
  return useCallback(async <T,>(operation: (session: Session) => Promise<T>) => {
    if (!session) throw new UpmsError('UNAUTHENTICATED', '请重新登录。')
    try {
      return await operation(session)
    } catch (error) {
      const state = useUserStore.getState()
      if (error instanceof UpmsError && error.code === 'UNAUTHENTICATED' && state.session === session) {
        state.logout()
        void message.info('会话已失效，请重新登录。')
      }
      throw error
    }
  }, [message, session])
}

export function useUpms() {
  const call = useAuthorizedCall()
  return useCallback(<T,>(path: string, body?: object) => call((session) => requestUpms<T>(session, path, body)), [call])
}

export function useUpmsBlob() {
  const call = useAuthorizedCall()
  return useCallback((path: string) => call((session) => requestUpmsBlob(session, path)), [call])
}

export function useUpmsData<T>(path: string) {
  const request = useUpms()
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    void request<T>(path).then((response) => {
      if (current) setData(response.data)
    }).catch((failure: unknown) => {
      if (current) setError(upmsErrorText(failure))
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [path, request, revision])
  return { data, error, loading, reload: () => setRevision((value) => value + 1) }
}

export function upmsErrorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请重试。'
}

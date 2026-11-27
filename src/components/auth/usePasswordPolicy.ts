import { useEffect, useState } from 'react'
import { getPasswordPolicy, type PasswordPolicy } from '../../utils/upms'
import { upmsErrorText } from '../../utils/useUpms'

export function usePasswordPolicy() {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<{ version: number; policy?: PasswordPolicy; error?: string }>()

  useEffect(() => {
    const request = new AbortController()
    void getPasswordPolicy(request.signal).then((policy) => {
      if (!request.signal.aborted) setResult({ version, policy })
    }).catch((error: unknown) => {
      if (!request.signal.aborted) setResult({ version, error: upmsErrorText(error) })
    })
    return () => request.abort()
  }, [version])

  const current = result?.version === version ? result : undefined
  return { policy: current?.policy, error: current?.error, reload: () => setVersion((value) => value + 1) }
}

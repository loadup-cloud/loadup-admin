import { UpmsError } from '../../utils/upms'
import type { FormDetail } from './formModel'

export function instancesPath(namespace: string) {
  return `/forms/${encodeURIComponent(namespace)}/instances`
}

export function requireFormDetail(data: FormDetail | null) {
  if (!data?.id || !Array.isArray(data.release?.items)) {
    throw new UpmsError('INVALID_RESPONSE', '表单服务未返回实例详情。')
  }
  return data
}

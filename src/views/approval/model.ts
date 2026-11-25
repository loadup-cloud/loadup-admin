import { useCallback } from 'react'
import { UpmsError } from '../../utils/upms'
import { useUpms, upmsErrorText } from '../../utils/useUpms'

export type Mode = 'USER' | 'ROLE' | 'SELECT_AT_START'
export type Option = { id: string; label: string }
export type Rule = {
  key: string
  name: string
  mode: Mode
  scope: { users: string[]; roles: string[]; departments: string[] }
  defaultUserId?: string | null
  roleId?: string | null
  allowOverride: boolean
}
export type Spec = {
  name: string
  allowWithdraw: boolean
  excludeApplicant: boolean
  distinctApprovers: boolean
  steps: Rule[]
}
export type Definition = {
  id: string; flowKey: string; version: number; revision: number; status: string; spec: Spec
}
export type Business = { type: string; id: string; version: string; contentHash: string }
export type Instance = {
  id: string; flowKey: string; definitionVersion: number; business: Business; title: string
  applicantId: string; status: string; revision: number; createdAt: string
}
export type Step = {
  id: string; rule: Rule; assigneeUserId?: string; assigneeRoleId?: string; status: string; completedBy?: string
}
export type Change = {
  stepKey: string; beforeUserId?: string; beforeRoleId?: string; afterUserId?: string; afterRoleId?: string
}
export type Action = { action: string; actorId: string; reason?: string; changes: Change[]; revision: number; occurredAt: string }
export type Detail = {
  instance: Instance; steps: Step[]; actions: Action[]; canAdjust: boolean; canDecide: boolean
  canWithdraw: boolean; blocked: boolean; deliveryStatus?: string
  userLabels: Record<string, string>; roleLabels: Record<string, string>
}
export type Task = { instance: Instance; stepId: string; stepName: string }

export const statusLabels: Record<string, string> = {
  DRAFT: '草稿', ACTIVE: '启用', RETIRED: '已退役', PENDING: '待审批', WAITING: '待开始',
  APPROVED: '已通过', REJECTED: '已驳回', WITHDRAWN: '已撤回', CANCELLED: '已取消',
  DELIVERED: '已送达', FAILED: '投递失败', POLL_ONLY: '可主动查询', READY: '待投递', RUNNING: '投递中',
}

export function useApproval(app: string) {
  const request = useUpms()
  return useCallback(async <T,>(path: string, body?: object, method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET',
    headers?: Record<string, string>) => {
    const result = await request<T>(`/v1/approval/${encodeURIComponent(app)}${path}`, body, method, headers)
    return result.data as T
  }, [request, app])
}

export function approvalError(error: unknown) {
  const detail = error instanceof UpmsError ? error.details as { reason?: string } | undefined : undefined
  return detail?.reason || upmsErrorText(error)
}

export function versionHeader(revision: number) {
  return { 'If-Match': `"${revision}"` }
}

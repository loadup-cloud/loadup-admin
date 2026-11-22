export const taskKinds = { IMPORT: '导入', EXPORT: '导出' }

export const taskStatuses = {
  QUEUED: { text: '排队中', status: 'Default', color: 'default' },
  RUNNING: { text: '运行中', status: 'Processing', color: 'processing' },
  SUCCEEDED: { text: '已成功', status: 'Success', color: 'success' },
  FAILED: { text: '已失败', status: 'Error', color: 'error' },
} as const

export type TransferKind = keyof typeof taskKinds
export type TransferStatus = keyof typeof taskStatuses

export type TransferTask = {
  id: string
  ownerId: string
  kind: TransferKind
  handlerKey: string
  sourceFileId?: string | null
  resultFileId?: string | null
  status: TransferStatus
  processedCount: number
  totalCount: number
  errorMessage?: string | null
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
}

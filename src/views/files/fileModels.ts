export type FileResource = {
  id: string
  ownerId: string
  filename: string
  contentType: string
  size: number
  provider: string
  createdAt?: string
  updatedAt?: string
}

export type FileReference = {
  id: string
  referenceType: string
  referenceId: string
  createdAt?: string
}

const units = ['B', 'KB', 'MB', 'GB']
const sizeFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 })

export function fileSize(bytes: number) {
  const unit = bytes >= 1 ? Math.min(Math.floor(Math.log2(bytes) / 10), units.length - 1) : 0
  return `${sizeFormatter.format(bytes / 1024 ** unit)} ${units[unit]}`
}

export function fileDate(value?: string) {
  return value?.replace('T', ' ').slice(0, 19) || '—'
}

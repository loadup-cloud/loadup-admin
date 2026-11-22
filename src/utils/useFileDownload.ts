import { useCallback } from 'react'
import type { FileResource } from './fileResources'
import { useUpms, useUpmsBlob } from './useUpms'

export default function useFileDownload() {
  const request = useUpms()
  const downloadBlob = useUpmsBlob()

  return useCallback(async (id: string, filename?: string) => {
    const [blob, name] = await Promise.all([
      downloadBlob(`/files/${encodeURIComponent(id)}/content`),
      filename ?? request<FileResource>('/files/detail', { id }).then(({ data }) => data?.filename || id),
    ])
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [downloadBlob, request])
}

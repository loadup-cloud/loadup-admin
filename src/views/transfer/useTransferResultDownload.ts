import { App } from 'antd'
import { useState } from 'react'
import useFileDownload from '../../utils/useFileDownload'
import { upmsErrorText, useUpms } from '../../utils/useUpms'

export default function useTransferResultDownload() {
  const request = useUpms()
  const downloadFile = useFileDownload()
  const { message } = App.useApp()
  const [downloadingId, setDownloadingId] = useState<string>()

  async function downloadResult(taskId: string) {
    if (downloadingId) return
    setDownloadingId(taskId)
    try {
      const { data } = await request<{ fileId: string }>('/transfer-tasks/result', { id: taskId })
      if (!data?.fileId) throw new Error('未能获取结果文件。')
      await downloadFile(data.fileId)
    } catch (failure) {
      void message.error(upmsErrorText(failure))
    } finally {
      setDownloadingId(undefined)
    }
  }

  return { downloadResult, downloadingId }
}

import { Alert, Button, Card, Flex, Form, Input, Skeleton, Typography } from 'antd'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FormInstanceEditor from '../../components/forms/FormInstanceEditor'
import { instancesPath, requireFormDetail } from '../../components/forms/formApi'
import { formIssue, type FormDetail } from '../../components/forms/formModel'
import { useUpms, useUpmsData } from '../../utils/useUpms'

const namespace = 'ASSET'
const path = instancesPath(namespace)

function DeviceInstance({ id }: { id: string }) {
  const { data, error, loading, reload } = useUpmsData<FormDetail>(
    `${path}/${encodeURIComponent(id)}`, undefined, 'GET',
  )
  if (loading) return <Skeleton active />
  if (!data?.id || !Array.isArray(data.release?.items) || error) {
    return <Alert type="error" showIcon title={error || '表单服务未返回实例详情。'}
      action={<Button size="small" onClick={reload}>重试</Button>} />
  }
  return <FormInstanceEditor namespace={namespace} initialInstance={data} />
}

export default function DeviceRequestPage() {
  const request = useUpms()
  const [params, setParams] = useSearchParams()
  const instanceId = params.get('instanceId')
  const releaseId = params.get('releaseId') ?? ''
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const attempt = useRef<{ releaseId: string; key: string }>(undefined)
  const [opened, setOpened] = useState<FormDetail>()

  async function start(input?: string) {
    setStarting(true)
    setError('')
    try {
      const id = input?.trim() || (await request<{ releaseId: string }>(
        '/forms/ASSET/demo/device-request', undefined, 'GET',
      )).data?.releaseId
      if (!id) throw new Error('未找到已发布的设备领用示例。')
      if (attempt.current?.releaseId !== id) {
        attempt.current = { releaseId: id, key: crypto.randomUUID() }
      }
      const { data } = await request<FormDetail>(`${path}/start`, { releaseId: id, requestKey: attempt.current.key })
      const created = requireFormDetail(data)
      attempt.current = undefined
      setOpened(created)
      setParams({ instanceId: created.id, releaseId: id })
    } catch (failure) {
      setError(formIssue(failure).message)
    } finally {
      setStarting(false)
    }
  }

  return (
    <section aria-labelledby="device-request-heading" style={{ maxWidth: 820 }}>
      <Typography.Title id="device-request-heading" level={2}>设备领用申请</Typography.Title>
      {instanceId ? (
        <>
          <Button type="link" style={{ paddingInline: 0, marginBottom: 12 }}
            onClick={() => {
              setOpened(undefined)
              setParams(releaseId ? { releaseId } : {})
            }}>新建申请</Button>
          {opened?.id === instanceId
            ? <FormInstanceEditor key={instanceId} namespace={namespace} initialInstance={opened} />
            : <DeviceInstance key={instanceId} id={instanceId} />}
        </>
      ) : (
        <Flex vertical gap="middle">
          {error && <Alert type="error" showIcon title={error} />}
          <Card title="新建申请">
            <Form key={releaseId} layout="vertical" initialValues={{ releaseId }}
              onFinish={(values: { releaseId?: string }) => void start(values.releaseId)} disabled={starting}>
              <Form.Item name="releaseId" label="表单发布 ID" extra="留空时使用本地设备领用示例。"
                rules={[{ max: 36, message: '请输入有效的表单发布 ID。' }]}>
                <Input autoComplete="off" />
              </Form.Item>
              <Button htmlType="submit" type="primary" loading={starting}>创建申请</Button>
            </Form>
          </Card>
          <Card title="查看已有申请">
            <Form layout="vertical" disabled={starting}
              onFinish={({ id }: { id: string }) => setParams({ instanceId: id.trim(), ...(releaseId && { releaseId }) })}>
              <Form.Item name="id" label="表单实例 ID"
                rules={[{ required: true, whitespace: true, max: 36, message: '请输入有效的表单实例 ID。' }]}>
                <Input autoComplete="off" />
              </Form.Item>
              <Button htmlType="submit">打开申请</Button>
            </Form>
          </Card>
        </Flex>
      )}
    </section>
  )
}

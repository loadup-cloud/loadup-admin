import {Alert, Button, Form, Input, Modal, Select, Space, Table, Tag} from 'antd'
import {useState} from 'react'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import {fileDate} from '../../utils/fileResources'
import {useUpms, useUpmsData} from '../../utils/useUpms'
import {notificationChannels, type Attempt, type Delivery, type GotoneRequest, type Receipt} from './notificationRoutes'

const statusLabels: Record<string, string> = {
    PENDING: '待发送', RETRY_WAIT: '等待重试', SENDING: '发送中', SENT: '已受理或写入',
    FAILED: '失败', UNKNOWN: '待核对', EXPIRED: '已过期',
}

function DeliveryDetails({id, onClose}: { id: string; onClose: () => void }) {
    const request = useUpms()
    const details = useUpmsData<GotoneRequest>(`/gotone/requests/${id}`, undefined, 'GET')
    const [resolution, setResolution] = useState<Delivery>()
    const [retry, setRetry] = useState<Delivery>()
    const deliveries = details.data?.deliveries ?? []
    const counts = new Map<string, number>()
    deliveries.forEach(({status}) => counts.set(status, (counts.get(status) ?? 0) + 1))
    return <>
        <Modal open title={`投递明细 · ${details.data?.receipt.serviceCode ?? id}`} width={980}
               onCancel={onClose} footer={<Button onClick={details.reload}>刷新明细</Button>}>
            {details.error && <Alert type="error" showIcon title={details.error}/>}
            <Space wrap>{Array.from(counts, ([status, count]) => <Tag
                key={status}>{statusLabels[status] ?? status} {count}</Tag>)}</Space>
            <Table<Delivery> rowKey="id" dataSource={deliveries} loading={details.loading}
                             expandable={{
                                 rowExpandable: ({attempts}) => attempts.length > 0, expandedRowRender: ({attempts}) =>
                                     <Table<Attempt> size="small" rowKey="number" pagination={false}
                                                     dataSource={attempts} columns={[
                                         {title: '尝试', dataIndex: 'number'}, {
                                             title: '账号',
                                             dataIndex: 'accountCode'
                                         },
                                         {title: '账号版本', dataIndex: 'configVersion'}, {
                                             title: '状态',
                                             render: (_, row) => statusLabels[row.status] ?? row.status
                                         },
                                         {title: '原因', dataIndex: 'reason'}, {
                                             title: '供应商回执',
                                             dataIndex: 'remoteId',
                                             ellipsis: true
                                         },
                                         {title: '开始时间', render: (_, row) => fileDate(row.startedAt)},
                                     ]}/>,
                             }}
                             columns={[
                                 {
                                     title: '渠道',
                                     render: (_, row) => notificationChannels[row.channel].label
                                 }, {title: '接收目标', dataIndex: 'target'},
                                 {title: '状态', render: (_, row) => statusLabels[row.status] ?? row.status},
                                 {
                                     title: '操作', render: (_, row) => {
                                         if (row.status === 'UNKNOWN') return <Button type="link"
                                                                                      onClick={() => setResolution(row)}>登记核对结果</Button>
                                         if (row.status === 'FAILED') return <Button type="link"
                                                                                     onClick={() => setRetry(row)}>重试</Button>
                                         return null
                                     }
                                 },
                             ]}/>
        </Modal>
        {retry && <UpmsFormDialog<{ reason: string }> title="重试投递" onClose={() => setRetry(undefined)}
                                                      onSave={async ({reason}) => {
                                                          await request('/gotone/deliveries/retry', {
                                                              reason,
                                                              deliveryId: retry.id
                                                          })
                                                          details.reload()
                                                      }}>
            <Form.Item name="reason" label="重试原因" rules={[{required: true, whitespace: true}]}><Input.TextArea
                maxLength={500}/></Form.Item>
        </UpmsFormDialog>}
        {resolution && <UpmsFormDialog<{ accepted: string; reason: string }> title="登记供应商核对结果"
                                                                             onClose={() => setResolution(undefined)}
                                                                             onSave={async (values) => {
                                                                                 await request('/gotone/deliveries/resolve', {
                                                                                     ...values,
                                                                                     accepted: values.accepted === 'true',
                                                                                     deliveryId: resolution.id
                                                                                 })
                                                                                 details.reload()
                                                                             }}>
            <Form.Item name="accepted" label="供应商结果" rules={[{required: true}]}>
                <Select options={[{value: 'true', label: '已受理'}, {value: 'false', label: '确认未受理'}]}/>
            </Form.Item>
            <Form.Item name="reason" label="核对依据" rules={[{required: true, whitespace: true}]}><Input.TextArea
                maxLength={500}/></Form.Item>
        </UpmsFormDialog>}
    </>
}

export default function GotoneDeliveryDialog({onClose}: { onClose: () => void }) {
    const requests = useUpmsData<Receipt[]>('/gotone/requests', undefined, 'GET')
    const [selected, setSelected] = useState<string>()
    return <>
        <Modal open title="投递记录" width={960} onCancel={onClose}
               footer={<Button onClick={requests.reload}>刷新</Button>}>
            {requests.error && <Alert type="error" showIcon title={requests.error}/>}
            <Table<Receipt> rowKey="requestId" dataSource={requests.data ?? []} loading={requests.loading} columns={[
                {title: '请求 ID', dataIndex: 'requestId'}, {title: 'Service Code', dataIndex: 'serviceCode'},
                {title: '配置版本', dataIndex: 'revision'}, {title: '目标数', dataIndex: 'targetCount'},
                {title: '受理时间', render: (_, row) => fileDate(row.acceptedAt)},
                {
                    title: '操作',
                    render: (_, row) => <Button type="link" onClick={() => setSelected(row.requestId)}>查看投递</Button>
                },
            ]}/>
        </Modal>
        {selected && <DeliveryDetails id={selected} onClose={() => setSelected(undefined)}/>}
    </>
}

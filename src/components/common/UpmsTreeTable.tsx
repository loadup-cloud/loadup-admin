import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Space, Table, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import type { Key } from 'react'
import { useState } from 'react'

function filterTree<T extends { children?: T[] | null }>(
  rows: T[],
  matches: (row: T) => boolean,
): T[] {
  return rows.flatMap((row) => {
    if (matches(row)) return [row]
    const children = filterTree(row.children ?? [], matches)
    return children.length ? [{ ...row, children }] : []
  })
}

function parentKeys<T extends { id: string; children?: T[] | null }>(rows: T[]): string[] {
  return rows.flatMap(({ id, children }) => children?.length ? [id, ...parentKeys(children)] : [])
}

export default function UpmsTreeTable<T extends { id: string; children?: T[] | null }>({
  title, records, columns, matches, loading, error, onCreate, onReload,
}: {
  title: string
  records: T[]
  columns: TableColumnsType<T>
  matches: (row: T, keyword: string) => boolean
  loading: boolean
  error: string
  onCreate: () => void
  onReload: () => void
}) {
  const [search, setSearch] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<readonly Key[]>([])
  const keyword = search.trim().toLowerCase()
  const rows = keyword ? filterTree(records, (row) => matches(row, keyword)) : records

  return (
    <section>
      <Typography.Title level={2}>{title}</Typography.Title>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>新建</Button>
        <Input allowClear aria-label="按名称或编码筛选" placeholder="按名称或编码筛选" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button icon={<ReloadOutlined />} onClick={onReload}>刷新</Button>
      </Space>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      <Table<T>
        rowKey="id"
        dataSource={rows}
        columns={columns}
        loading={loading}
        pagination={false}
        expandable={{
          expandedRowKeys: keyword ? parentKeys(rows) : expandedKeys,
          onExpandedRowsChange: setExpandedKeys,
          expandIcon: keyword ? () => null : undefined,
        }}
        scroll={{ x: 'max-content' }}
      />
    </section>
  )
}

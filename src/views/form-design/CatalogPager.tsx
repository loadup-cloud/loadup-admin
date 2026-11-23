import { Button, Flex, Typography } from 'antd'

export default function CatalogPager({ page, hasNext, loading, onPage }: {
  page: number
  hasNext: boolean
  loading: boolean
  onPage: (page: number) => void
}) {
  return (
    <Flex align="center" justify="end" gap="small" style={{ marginTop: 16 }}>
      <Button disabled={page === 1 || loading} onClick={() => onPage(page - 1)}>上一页</Button>
      <Typography.Text type="secondary">第 {page} 页</Typography.Text>
      <Button disabled={!hasNext || loading} onClick={() => onPage(page + 1)}>下一页</Button>
    </Flex>
  )
}

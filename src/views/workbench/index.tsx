import { Col, Row, Typography } from 'antd'
import { useMenuAccess } from '../../components/auth/menuAccess'
import RecentNotifications from './RecentNotifications'
import RecentTransferTasks from './RecentTransferTasks'

export default function WorkbenchPage() {
  const { paths } = useMenuAccess()

  return (
    <section aria-labelledby="workbench-heading">
      <Typography.Title id="workbench-heading" level={2}>工作台</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <RecentNotifications />
        </Col>
        {paths.has('/transfer') && (
          <Col xs={24} xl={12}>
            <RecentTransferTasks />
          </Col>
        )}
      </Row>
    </section>
  )
}

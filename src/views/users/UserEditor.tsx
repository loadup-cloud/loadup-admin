import { Col, Form, Input, Row, Select, TreeSelect } from 'antd'
import UpmsFormDialog from '../../components/common/UpmsFormDialog'
import type { UpmsUser } from '../../utils/upms'
import { enabledOptions, type Department, type Role } from '../../utils/upmsModels'
import { useUpms } from '../../utils/useUpms'

type UserDetail = UpmsUser & {
  deptId?: string | null
  realName?: string | null
  remark?: string | null
}

export type UserEditorData = {
  user?: UserDetail
  departments: Department[]
  roles: Role[]
}

type UserFields = {
  username: string
  password: string
  nickname: string
  deptId: string
  roleIds?: string[]
  status: number
  realName?: string
  email?: string
  mobile?: string
  remark?: string
}

type DepartmentOption = { value: string; title: string; disabled: boolean; children: DepartmentOption[] }

function departmentOptions(departments: Department[], enabled: Set<string>): DepartmentOption[] {
  return departments.map((department) => {
    const disabled = department.status !== 1
    if (!disabled) enabled.add(department.id)
    return {
      value: department.id,
      title: disabled ? `${department.deptName}（已停用）` : department.deptName,
      disabled,
      children: departmentOptions(department.children ?? [], enabled),
    }
  })
}

function flattenRoles(roles: Role[]): Role[] {
  return roles.flatMap((role) => [role, ...flattenRoles(role.children ?? [])])
}

export default function UserEditor({ data, onClose, onSaved }: {
  data: UserEditorData
  onClose: () => void
  onSaved: () => void
}) {
  const request = useUpms()
  const { user } = data
  const enabledDepartments = new Set<string>()
  const departments = departmentOptions(data.departments, enabledDepartments)
  const enabledRoles = flattenRoles(data.roles).filter(({ status }) => status === 1)
  const enabledRoleIds = new Set(enabledRoles.map(({ id }) => id))
  const currentRoles = user?.roles ?? []
  const currentRoleIds = new Set(currentRoles.map(({ id }) => id))
  const unavailableRoles = currentRoles.filter(({ id }) => !enabledRoleIds.has(id))
  const roles = [
    ...enabledRoles.map(({ id, roleName, roleCode }) => ({ value: id, label: `${roleName}（${roleCode}）` })),
    ...unavailableRoles.map(({ id, roleName, roleCode }) => ({ value: id, label: `${roleName || roleCode}（不可分配）` })),
  ]
  const statusOptions = user?.status === 2
    ? [...enabledOptions, { label: '锁定', value: 2, disabled: true }]
    : enabledOptions

  async function save(fields: UserFields) {
    const roleIds = fields.roleIds ?? []
    const rolesChanged = roleIds.length !== currentRoleIds.size || roleIds.some((id) => !currentRoleIds.has(id))
    if (rolesChanged && roleIds.some((id) => !enabledRoleIds.has(id))) {
      throw new Error('保存角色变更前，请移除所选的不可分配角色。')
    }
    const profile = {
      nickname: fields.nickname.trim(),
      deptId: fields.deptId,
      realName: fields.realName?.trim() || undefined,
      email: fields.email?.trim() || undefined,
      mobile: fields.mobile?.trim() || undefined,
      remark: fields.remark?.trim(),
    }
    if (user) {
      await request('/upms/user/update', {
        ...profile,
        id: user.id,
        nickname: fields.nickname === user.nickname ? undefined : profile.nickname,
        deptId: fields.deptId === user.deptId ? undefined : fields.deptId,
        status: fields.status === user.status ? undefined : fields.status,
        roleIds: rolesChanged ? roleIds : undefined,
        remark: fields.remark === (user.remark ?? '') ? undefined : profile.remark,
      })
    } else {
      await request('/upms/user/create', {
        ...profile, username: fields.username, password: fields.password, status: fields.status, roleIds,
      })
    }
    onSaved()
  }

  const keepExisting = user ? '留空保留原值' : undefined
  return (
    <UpmsFormDialog<UserFields>
      title={user ? '编辑用户' : '新增用户'}
      initialValues={{
        username: user?.username,
        nickname: user?.nickname ?? undefined,
        deptId: user?.deptId ?? undefined,
        status: user?.status ?? 1,
        roleIds: [...currentRoleIds],
        remark: user?.remark ?? '',
      }}
      onSave={save}
      onClose={onClose}
    >
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item name="username" label="用户名" rules={[{
            required: true, pattern: /^[a-zA-Z0-9_]{3,30}$/, message: '请输入 3 到 30 位字母、数字或下划线',
          }]}>
            <Input maxLength={30} disabled={Boolean(user)} autoComplete="off" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, whitespace: true, max: 50 }]}>
            <Input maxLength={50} />
          </Form.Item>
        </Col>
      </Row>
      {!user && (
        <Form.Item name="password" label="初始密码" rules={[{ required: true, whitespace: true }, {
          validator: (_, value?: string) => !value || (Array.from(value).length >= 8 && new TextEncoder().encode(value).length <= 72)
            ? Promise.resolve()
            : Promise.reject(new Error('请输入至少 8 个字符、UTF-8 编码不超过 72 字节的密码。')),
        }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      )}
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item name="deptId" label="所属部门" rules={[{ required: true }, {
            validator: (_, value?: string) => !value || enabledDepartments.has(value)
              ? Promise.resolve() : Promise.reject(new Error('请选择已启用的部门。')),
          }]}>
            <TreeSelect
              aria-label="所属部门"
              placeholder="请选择部门"
              showSearch={{ treeNodeFilterProp: 'title' }}
              treeData={departments}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="status" label="账号状态" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="roleIds" label="角色" extra={unavailableRoles.length > 0 ? '可保留既有角色。变更角色时，请移除不可分配的角色。' : undefined}>
        <Select aria-label="角色" mode="multiple" showSearch={{ optionFilterProp: 'label' }} allowClear options={roles} />
      </Form.Item>
      <Form.Item name="realName" label="真实姓名" extra={user?.realName ? `当前：${user.realName}` : undefined}>
        <Input maxLength={50} placeholder={keepExisting} />
      </Form.Item>
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item name="email" label="邮箱" extra={user?.email ? `当前：${user.email}` : undefined}
            rules={[{ type: 'email', transform: (value: string) => value?.trim() }]}>
            <Input maxLength={100} placeholder={keepExisting} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="mobile" label="手机号" extra={user?.mobile ? `当前：${user.mobile}` : undefined}
            rules={[{ pattern: /^1[3-9]\d{9}$/, transform: (value: string) => value?.trim(), message: '请输入有效的手机号' }]}>
            <Input maxLength={11} placeholder={keepExisting} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="remark" label="备注"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
    </UpmsFormDialog>
  )
}

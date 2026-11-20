type ManagedEntry = {
  id: string
  parentId?: string | null
  sortOrder?: number | null
  status?: number | null
  remark?: string | null
}

export type Department = ManagedEntry & {
  deptName: string
  deptCode: string
  leaderUserName?: string | null
  mobile?: string | null
  email?: string | null
  children?: Department[] | null
}

export type Permission = ManagedEntry & {
  permissionName: string
  permissionCode: string
  permissionType?: number | null
  resourcePath?: string | null
  httpMethod?: string | null
  icon?: string | null
  componentPath?: string | null
  visible?: boolean | null
  children?: Permission[] | null
}

export type Role = ManagedEntry & {
  roleName: string
  roleCode: string
  parentRoleName?: string | null
  dataScope?: number | null
  departmentIds?: string[] | null
  permissions?: Pick<Permission, 'id' | 'permissionName' | 'permissionCode'>[] | null
  children?: Role[] | null
}

export const enabledOptions = [{ label: '启用', value: 1 }, { label: '停用', value: 0 }]
export const permissionTypes = [{ label: '菜单', value: 1 }, { label: '按钮', value: 2 }, { label: '接口', value: 3 }]
export const scopeOptions = [
  { label: '全部数据', value: 1 },
  { label: '指定部门', value: 2 },
  { label: '本部门', value: 3 },
  { label: '本部门及下级', value: 4 },
  { label: '仅本人', value: 5 },
]

export function treeOptions<T extends { id: string; children?: T[] | null }>(
  entries: T[],
  title: (entry: T) => string,
  excludeId?: string,
): { value: string; title: string; children?: ReturnType<typeof treeOptions<T>> }[] {
  return entries.filter(({ id }) => id !== excludeId).map((entry) => ({
    value: entry.id,
    title: title(entry),
    children: entry.children?.length ? treeOptions(entry.children, title, excludeId) : undefined,
  }))
}

import { useEffect, useState, useRef } from 'react';
import { AppstoreOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Layout, Menu } from 'antd';
import type { MenuItemType } from 'antd/es/menu/interface';
import { routes } from '../../router';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import useUserStore from '../../store/user';
import { isSuperAdmin } from '../../utils/upms';
import type { Permission } from '../../utils/upmsModels';
import { useMenuAccess } from '../auth/menuAccess';

const { Sider } = Layout;

// Custom hook for responsive breakpoints
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth <= 768)
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024)
    }
    
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  return { isMobile, isTablet }
}

type NavigationItem = MenuItemType & { key: string; children?: NavigationItem[] }

function getMenuItems(entries: Permission[], superAdmin: boolean): NavigationItem[] {
  const routeMenus = routes.flatMap(({ meta }) =>
    meta && typeof meta.key === 'string' && !meta.hideInMenu ? [{ ...meta, key: meta.key }] : [],
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const configuredRoutes = new Map(routeMenus
    .filter((entry) => entry.requiresMenuGrant)
    .map((entry) => [entry.key, entry]))

  const toItems = (permissions: Permission[]): NavigationItem[] => permissions.flatMap((permission) => {
    const route = configuredRoutes.get(permission.resourcePath ?? '')
    const children = toItems(permission.children ?? [])
    const page = route && (!route.requiresSuperAdmin || superAdmin)
      ? [{ key: route.key, label: permission.permissionName, icon: route.icon }]
      : []

    return children.length
      ? [{ key: `upms-menu:${permission.id}`, label: permission.permissionName, icon: <AppstoreOutlined />,
        children: [...page, ...children] }]
      : page
  })

  const personal: NavigationItem[] = []
  const system: NavigationItem[] = []
  for (const { key, label, icon, requiresMenuGrant, requiresSuperAdmin } of routeMenus) {
    if (requiresMenuGrant) continue
    if (requiresSuperAdmin) {
      if (superAdmin) system.push({ key, label, icon })
    } else {
      personal.push({ key, label, icon })
    }
  }

  return [
    { key: 'account', label: '个人中心', icon: <UserOutlined />, children: personal },
    ...toItems(entries),
    ...(system.length ? [{ key: 'system', label: '系统管理', icon: <SettingOutlined />, children: system }] : []),
  ]
}

function activeMenu(items: NavigationItem[], pathname: string): string[] {
  for (const item of items) {
    if (item.children) {
      const child = activeMenu(item.children, pathname)
      if (child.length) return [...child, item.key]
    } else if (matchPath(item.key, pathname)) {
      return [item.key]
    }
  }
  return []
}

/**
 * PageSidebar
 * @param props {autoCollapse?: boolean} automatic collapes menu when click another menu
 * @returns 
 */
type PageSidebarProps = {
  autoCollapse?: boolean
  height?: string | number
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

const PageSidebar = (props: PageSidebarProps) => {
  const { autoCollapse = true, height = '100%', collapsed: externalCollapsed, onCollapse } = props
  const session = useUserStore((state) => state.session)
  const menu = useMenuAccess()
  const menuItems = session ? getMenuItems(menu.entries, isSuperAdmin(session)) : []
  const navigate = useNavigate()
  const location = useLocation()
  const [opened, setOpened] = useState<{ pathname: string; keys: string[] }>()
  const [selected, ...parents] = activeMenu(menuItems, location.pathname)
  const openKeys = opened?.pathname === location.pathname ? opened.keys : parents
  
  // Responsive breakpoints
  const { isMobile } = useResponsive()
  
  // Auto collapse on mobile
  const [internalCollapsed, setInternalCollapsed] = useState(isMobile)
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const prevIsMobileRef = useRef<boolean | null>(null)
  
  // Only auto collapse when switching from desktop to mobile, not when user manually opens sidebar
  useEffect(() => {
    const prevIsMobile = prevIsMobileRef.current
    // Only check transition if we have a previous value (skip first render)
    if (prevIsMobile !== null && !prevIsMobile && isMobile && !collapsed) {
      // Switching from desktop to mobile, auto collapse
      onCollapse?.(true)
      setInternalCollapsed(true)
    }
    // Update ref after checking, so next render has the previous value
    prevIsMobileRef.current = isMobile
  }, [isMobile, collapsed, onCollapse])
  
  const handleCollapse = (collapsed: boolean) => {
    if (onCollapse) {
      onCollapse(collapsed)
    } else {
      setInternalCollapsed(collapsed)
    }
  }

  const onSwitchMenu = ({ key, keyPath }: { key: string; keyPath: string[] }) => {
    setOpened({ pathname: key, keys: autoCollapse ? keyPath.slice(1) : openKeys })
    navigate(key)
    // Auto collapse sidebar on mobile after navigation
    if (isMobile && !collapsed) {
      handleCollapse(true)
    }
  }

  const onOpenChange = (openKeys: string[]) => {
    setOpened({ pathname: location.pathname, keys: openKeys })
  }

  return (
    <Sider 
      theme='light' 
      style={{ 
        height, 
        overflow: 'auto',
        position: 'fixed',
        left: 0,
        top: 64,
        bottom: 0,
        zIndex: 100,
        ...(isMobile && collapsed ? { display: 'none' } : {}),
      }}
      collapsible
      collapsed={collapsed}
      onCollapse={handleCollapse}
      breakpoint="lg"
      collapsedWidth={isMobile ? 0 : 80}
      width={200}
      trigger={null}
    >
      <Menu 
        openKeys={collapsed ? undefined : openKeys}
        onOpenChange={collapsed ? undefined : onOpenChange} 
        selectedKeys={selected ? [selected] : []}
        mode="inline" 
        items={menuItems} 
        onClick={onSwitchMenu}
        inlineCollapsed={collapsed}
        triggerSubMenuAction={collapsed ? 'hover' : 'click'}
      />
      {session && menu.status === 'error' && !collapsed && (
        <Button type="link" onClick={menu.retry}>重新加载业务菜单</Button>
      )}
    </Sider>
  )
}

export default PageSidebar

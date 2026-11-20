import {
  RouteObject,
  createBrowserRouter,
} from "react-router-dom";
import App from "../App";
import { MenuItemType } from "antd/es/menu/interface";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AccountHome from "../components/auth/AccountHome";


export type AdminRouterItem = RouteObject & {
  // Set antd menu props in meta
  meta?: MenuItemType & {
    hideInMenu?: boolean
    requiresAuth?: boolean
    requiresSuperAdmin?: boolean
    order?: number
  }
  children?: AdminRouterItem[]
}

/**
 * Auto load route from views/***\/*.router.ts
 * @returns route
 */
const loadRouteModules = () => {
  const routeModuleFiles = import.meta.glob([
    '../views/**/*.router.tsx',
    '!../views/{customers,dashboard,profile,team}/**/*.router.tsx',
  ], {
    eager: true,
    import: 'default'
  })
  const routeModules: AdminRouterItem[] = []

  for (const module of Object.values(routeModuleFiles)) {

    if (module) {
      const routes = Array.isArray(module) ? module : [module];
      routeModules.push(...routes);
    }
  }


  return routeModules
}

const routeModules = loadRouteModules()

// Separate auth routes and protected routes
const authRoutes: AdminRouterItem[] = []
const protectedRoutes: AdminRouterItem[] = []

const wrapWithProtectedRoute = (route: AdminRouterItem): AdminRouterItem => {
  const wrappedChildren = route.children?.map(child => wrapWithProtectedRoute(child)) as AdminRouterItem[] | undefined
  
  return {
    ...route,
    element: route.element
      ? <ProtectedRoute requiresSuperAdmin={route.meta?.requiresSuperAdmin}>{route.element}</ProtectedRoute>
      : route.element,
    children: wrappedChildren,
  } as AdminRouterItem
}

routeModules.forEach(route => {
  // Auth routes don't require authentication.
  if (route.path?.startsWith('auth/')) {
    authRoutes.push(route)
  } else {
    // Wrap protected routes with ProtectedRoute
    protectedRoutes.push(wrapWithProtectedRoute(route))
  }
})

export const routes: AdminRouterItem[] = [
  ...authRoutes,
  ...protectedRoutes,
  { index: true, element: <AccountHome /> },
  {
    path: '*',
    element: <AccountHome />,
  },
]

const routerConfig: RouteObject[] = [{
  path: "/",
  element: <App />,
  children: routes,
}]

const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routerConfig)
export default router

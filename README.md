# React Admin Dashboard

## LoadUp Admin 本地运行

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5173/，用现有的 UPMS 账号登录。开发服务器把 `/api` 转发到 `127.0.0.1:8080`，请求默认携带 `X-Tenant-Code: local`。可在 `.env.local` 配置 `LOADUP_API_TARGET` 和 `VITE_LOADUP_TENANT_CODE`。

登录后进入「工作台」(`/workbench`)。这里显示本人最近五条通知、未读数和最近五条导入导出任务。支持查看通知正文、标记已读、打开站内链接，以及下载已成功任务的结果文件。

用户管理需要 UPMS 超级管理员角色，支持关键词筛选、服务端分页、新增、编辑、删除、选择部门和分配角色，以及锁定和解锁。编辑时姓名、邮箱和手机号留空会保留原值。当前用户列表接口未返回手动锁定标记，操作结果以 UPMS 响应为准。新增页面沿用模板的 `*.router.tsx` 模块注册方式，示例业务模块保留在源码中。

超级管理员也可以管理角色、部门和权限。角色页支持调整数据范围、直接权限和成员，部门与权限页以树形显示层级。所有已登录账号均可打开「账号安全」查看自己的登录记录和修改密码。

「审计日志」使用 `POST /api/audit/events/query`，仅向超级管理员开放。操作人可以按账号或昵称查找，也可以直接指定 ID。操作类型按完整名称匹配，时间范围使用应用本地时间。详情展示接口返回的事件元数据，自动采集范围由后端的 `loadup.modules.audit.web.include-paths` 配置。

「数据字典」使用 `/api/dictionaries` 管理接口，支持按关键词和状态筛选字典及其字典项，并维护记录及启停状态。字典编码和字典项的值在创建后固定。只有空字典可以删除。

「设备领用申请」位于 `/forms/device-request`，使用 `/api/forms/ASSET/instances`。LoadUp Boot 的 local profile 提供已发布的示例，拥有 `form:asset:fill` 的账号可直接点「创建申请」。也可指定发布 ID 或通过 `?releaseId=<发布 ID>` 打开填写入口。保存草稿后可通过申请编号或实例链接重新打开。提交后回显服务端冻结的结果。

其他业务可复用 `src/components/forms/FormInstanceEditor.tsx`，传入命名空间和后端实例详情。字段身份、控件、选项和锁定规则来自该实例绑定的发布定义。草稿请求按条目和字段 Key 发送用户填写值。

「表单设计」位于 `/forms/design`。设计权限可查看字段目录、编辑字段组和模板草稿、预览模板。发布权限还可以新增字段版本、发布字段组和模板，以及退役模板。本地设备领用示例使用 `form:asset:design` 和 `form:asset:publish`。在字段组设置控件、分区和顺序，在模板引用已发布的字段组版本。模板发布后可从预览复制发布 ID。

「文件资源」使用 `/api/files`，支持上传、下载、查看详情和业务引用，以及删除无引用文件。普通账号管理自己的文件，超级管理员可按所有者查询。

「导入导出任务」使用 `/api/transfer-tasks`。导入时选取当前账号已上传的源文件，按任务类型和状态查询分页，成功后从文件资源下载结果。超级管理员可按所有者查询。LoadUp Boot 本地环境的示例处理器为 `demo-csv-import` 和 `demo-csv-export`。

「通知管理」使用 `/api/notifications`，支持筛选当前账号的全部或未读通知、服务端分页、查看完整正文、单条或全部标记已读，以及归档。列表和未读数会在操作后刷新，归档通知会从收件箱移除。超级管理员可搜索并选择多个收件人发布通知，跳转地址可填写站内路径。

顶部通知铃铛显示当前账号的未读数，展开可查看最近 5 条未读通知的详情，也可进入通知管理。已读和归档操作会同步更新角标。

> Production-ready SaaS admin template built with React 19, TypeScript 6, Vite 8, and Ant Design v6.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://react-admin-dashboard-gamma-six.vercel.app/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-purple)](https://vite.dev/)

---

## Overview

| Why it matters | How it helps |
| --- | --- |
| ⚡️ Modern stack | React 19 + Vite 8 + TypeScript 6 = instant HMR and full type safety |
| 🎨 Polished UI | Ant Design v6 components, theme switcher, and adaptive layouts |
| 🔐 Real workflows | Auth, protected routes, SaaS dashboard, and customer lifecycle management |
| 🧱 Strong DX | File-based routing, lazy route loading, Zustand stores, mock APIs, and zero-config startup |

### SaaS Demo Modules
- **Dashboard** – KPI cards, lightweight revenue trend chart, customer source breakdown, and automated health insights
- **Customers** – Advanced filtering, ownership, status transitions, detail drawer, and activity timeline
- **Team Roles** – Nested role listing, detailed role insights, and permission matrix editor

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.7 | UI Framework |
| TypeScript | 6.0.3 | Type Safety |
| Vite | 8.1.0 | Build Tool |
| Ant Design | 6.5.0 | UI Components |
| React Router | 7.18.0 | Routing |
| Zustand | 5.0.14 | State Management |
| Axios | 1.18.1 | HTTP Client |

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # Shell layout: header, sidebar, breadcrumbs, content
│   └── auth/            # Shared auth UI pieces
├── config/
│   ├── theme.ts         # Theme configuration types and utilities
│   └── theme-presets.ts # Preset theme definitions
├── views/
│   ├── auth/            # Login & register pages (unprotected)
│   ├── dashboard/       # SaaS dashboard page + routes
│   └── customers/       # Customer management module + routes
├── router/              # Auto-imported route definitions & guards
├── store/               # Zustand stores (config + user)
├── utils/               # API client, mock helpers, shared utils
└── App.tsx              # Root layout orchestration
```

---

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm

### Installation

```bash
git clone https://github.com/itsyujay/react-admin-dashboard.git
cd react-admin-dashboard
npm install
npm run dev
```

Visit `http://localhost:5173`.

### Demo Credentials
| Role | Username | Password | Shortcut |
| --- | --- | --- | --- |
| Admin | `admin` | `admin123` | `/auth/login?demo=admin` |
| User | `user` | `user123` | `/auth/login?demo=user` |
| Demo | `demo` | `demo123` | `/auth/login?demo=demo` |

---

## Core Concepts

### Authentication & Authorization
- Login/register flows with Ant Design forms
- `ProtectedRoute` wrapper guarding all non-`/auth/**` routes
- Tokens stored in Zustand + localStorage with auto-injection via Axios interceptors

### Routing
- Vite `import.meta.glob` auto-loads every `*.router.tsx`
- `meta` drives sidebar label/icon/hide/order plus page title
- Nested routes supported out of the box (see `customers` module)

### Theming
- Light / Dark / Compact algorithms controlled via Zustand store
- Persistent theme preferences using localStorage
- **Preset themes**: Blue, Green, Purple, Orange, Teal, Red, Cyan
- **Custom colors**: Support for primary, secondary, success, warning, error, info, background, and text colors
- Runtime theme switching and color customization via store

### Layout & Responsiveness
- Sticky header, collapsible sidebar, breadcrumb trail, and flexible content area
- Breakpoint-aware spacing and auto-collapse on mobile
- Dark-mode-aware charts and cards (Ant Design charts + tokens)

---

## Customization Guide

### Add a Route & Page
1. Create a directory under `src/views/your-page`
2. Build your page component in `index.tsx`
3. Define a `*.router.tsx` file:

```tsx
// src/views/example/example.router.tsx
import { ExampleOutlined } from '@ant-design/icons'
import { AdminRouterItem } from '../../router'
import ExamplePage from '.'

const exampleRoutes: AdminRouterItem[] = [
  {
    path: 'example',
    element: <ExamplePage />,
    meta: {
      label: 'Example',
      title: 'Example Page',
      key: '/example',
      icon: <ExampleOutlined />,
      order: 3,
    },
  },
]

export default exampleRoutes
```

### Adjust Theme Defaults

#### Option 1: Use Preset Themes
```ts
import useConfigStore from './store/config'

// Switch to a preset theme
const setTheme = useConfigStore(state => state.setTheme)
setTheme('blue')  // or 'green', 'purple', 'orange', 'teal', 'red', 'cyan'
```

#### Option 2: Customize Individual Colors
```ts
import useConfigStore from './store/config'

// Customize a specific color
const setCustomColor = useConfigStore(state => state.setCustomColor)
setCustomColor('primary', '#1890ff')
setCustomColor('success', '#52c41a')
// Available color keys: primary, secondary, success, warning, error, info, background, text
```

#### Option 3: Modify Default Theme in Code
Modify `src/config/theme-presets.ts` to change preset theme colors, or modify `src/store/config.ts` to change the default theme:
```ts
// In src/store/config.ts
const defaultThemeConfig = createDefaultThemeConfig()
defaultThemeConfig.colors.primary = '#your-color'
defaultThemeConfig.colors.secondary = '#your-secondary-color'
```

### API / Mock Settings
`.env` (create if missing):
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK=true             # use built-in mock auth/data
```

---

## NPM Scripts

```bash
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # ESLint check (ts/tsx)
```

---

## Deployment
Output lives in `dist/`. Any static host works:
- [Vercel](https://vercel.com/) – zero-config for Vite
- [Netlify](https://www.netlify.com/) – continuous deployments
- [GitHub Pages](https://pages.github.com/) – static hosting

---

## Contributing
PRs and issues are welcome! Please:
1. Fork the repo & create a feature branch
2. Add tests or docs where it makes sense
3. Run `npm run lint` before submitting

---

## License
MIT © [Yujian Xue](https://yujay.dev)

Acknowledgements: [Ant Design](https://ant.design/), [Vite](https://vitejs.dev/), [React Router](https://reactrouter.com/), [Zustand](https://github.com/pmndrs/zustand)

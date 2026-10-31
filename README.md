# LoadUp Admin

LoadUp Admin 是 LoadUp Cloud 的 Vue 3 管理界面，基于 [ElementAdmin v3](https://github.com/kailong321200875/vue-element-plus-admin) 上游提交 `9047610a7ba478174a528916bff1ca44dcadc119`。上游 MIT 许可见 [LICENSE](LICENSE)。当前实现以本文档和 `apps/docs` 中的 VitePress 文档为准。

## 本地开发

需要 Node.js `^20.19.0 || ^22.13.0 || >=24.0.0` 和 pnpm `>=12 <13`（仓库固定为 `12.14.0`）。在本目录执行：

```sh
corepack enable
pnpm install
pnpm dev:admin
```

管理端默认运行在 <http://localhost:4000/>。开发服务器将 `/api` 代理到 `http://127.0.0.1:8080`；如需使用其他后端，可在 `apps/admin/.env.base.local` 中设置 `VITE_BACKEND_URL`。生产部署需将 `/api` 转发到 LoadUp 后端。应用使用 hash 路由。

## 页面与接口

- 登录调用 `POST /api/auth/login`；`POST /api/upms/permission/user-menu` 返回用户菜单树。
- UPMS 菜单提供用户、角色、部门和权限管理。没有对应页面组件的菜单显示占位页。
- 工作台包含审计事件、数据字典、文件资源、站内通知、导入导出任务和账号安全页面。
- `/merchants/list` 通过 `/api/merchants/**` 管理商户资料。
- `/contract/*` 提供产品目录、条件配置、产品组合、销售方案和商户合约页面。

JSON 接口统一使用 POST 和 JSON 请求体；按 ID 操作时传入 `{ "id": "..." }`，无参数操作传入 `{}`。文件上传使用 multipart，下载使用二进制流。页面操作仍受后端权限控制；商户合约功能依赖服务端配置的可信商户资料。

## 文档

VitePress 文档源码位于 `apps/docs`，可在本地预览：

```sh
pnpm dev:docs
```

文档站与管理端是独立的 workspace 应用；部署和托管由消费项目负责。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev:admin` | 启动管理端开发服务器 |
| `pnpm build:admin` | 构建生产版管理端 |
| `pnpm typecheck` | 检查管理端和公共包的类型 |
| `pnpm lint` | 运行 Oxlint |
| `pnpm format:check` | 检查代码格式 |
| `pnpm style:check` | 检查样式 |
| `pnpm dev:docs` / `pnpm build:docs` | 运行或构建文档站 |

模块边界和运行流程见 [ARCHITECTURE.md](ARCHITECTURE.md)。

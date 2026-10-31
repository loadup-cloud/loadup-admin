# LoadUp Admin 架构

## 工作区边界

pnpm 工作区由两个应用和一组公共包组成：

```text
apps/admin      LoadUp 专用路由、页面、API 模型、状态管理和运行配置
apps/docs       VitePress 文档站
packages/       可复用 UI 组件、hooks、请求客户端和样式
```

公共包以 workspace 源码方式被引用并由 Vite 编译，不能反向依赖应用代码。LoadUp API 契约和业务页面放在 `apps/admin`；只有形成稳定且与应用无关的接口后，才将代码移入 `packages`。

## 运行流程

`apps/admin/src/main.ts` 创建 Vue 应用并安装 router、Pinia、Element Plus、语言环境和应用插件。`App.vue` 为当前路由提供全局配置。路由包含应用外壳和本地业务页面；登录后，用户菜单接口返回可访问的 UPMS 菜单项并转换为运行时路由。

布局使用四种模式之一呈现可见路由树：侧边栏、顶部导航、混合导航或双侧边栏。应用 store 持久化布局、暗色模式和侧栏折叠状态。`apps/admin/src/api` 中的模块通过公共 `@vea/request` 客户端发起请求，由客户端应用后端地址和认证行为。

## 业务区域

路由和页面分为仪表盘、工作台、商户和合约区域。工作台页面调用 `/api/audit/**`、`/api/dictionaries/**`、`/api/files/**`、`/api/notifications/**`、`/api/transfer-tasks/**` 和 `/api/account/security/**`。商户页面调用 `/api/merchants/**`；合约页面调用 `/api/contract/**`。

JSON Controller 接口通过 POST 和 JSON 请求体调用。文件上传使用 multipart，下载使用请求客户端的二进制下载流程。后端权限和可信业务事实由服务端负责。

## 本地开发与文档

Admin Vite 开发服务器监听 4000 端口，并将 `/api` 代理到 `VITE_BACKEND_URL`，默认地址为 `http://127.0.0.1:8080`。应用使用 hash 路由。`apps/docs` 下的 VitePress 应用通过 `pnpm dev:docs` 启动，是独立维护的产品文档源码。

环境要求和工作区命令见 [README.md](README.md)。文档站入口是 [`apps/docs/index.md`](apps/docs/index.md)。

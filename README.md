# LoadUp Admin 接入手册

LoadUp Admin 是连接 UPMS 与 LoadUp 业务模块的管理端。页面、请求与会话边界见 [架构设计](ARCHITECTURE.md)。

## 角色菜单

侧栏将工作台、账号安全和站内通知归到「个人中心」。超级管理员可进入「系统管理」。业务页面由 UPMS 的有效角色菜单驱动。管理员可在「权限管理」创建无路径的分组，随后为其二级菜单填写 `/files`、`/transfer`、`/forms/design`、`/forms/device-request` 或 `/approval`，再在「角色管理」勾选页面权限。Boot 提供默认角色和菜单，详见 [Boot 接入手册](../loadup-boot/README.md#admin-菜单和角色)。

保存角色授权后，用户重新登录即可更新菜单和令牌中的应用权限。

## 本地运行

需要 Node.js 22.13+（22.x）或 24+，pnpm 版本由 [package.json](package.json) 固定。先启动 [LoadUp Boot](../loadup-boot/README.md) 或兼容的后端，再在本仓库执行。

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

打开 http://127.0.0.1:5173/，用现有的 UPMS 账号登录。开发服务器把 `/api` 转发到 `127.0.0.1:8080`，请求默认携带 `X-Tenant-Code: local`。可在 `.env.local` 配置 `LOADUP_API_TARGET` 和 `VITE_LOADUP_TENANT_CODE`。

## 已接入业务

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

「通知管理」的收件箱、通知铃铛和工作台使用 `/api/inbox` 查询及更新当前用户的站内消息。超级管理员通过 `/api/gotone` 维护服务编码、渠道模板及系统发送账号，也可发布通知并按目标查看投递与尝试。

顶部通知铃铛显示当前账号的未读数，展开可查看最近 5 条未读通知的详情，也可进入通知管理。已读和归档操作会同步更新角标。

「审批管理」位于 `/approval`，提供审批模板、发起申请、待处理事项和申请详情。角色、模板的可见与操作范围由 [审批模块](../loadup-modules/loadup-modules-approval/README.md) 决定。

## 修改与重置密码

「个人中心 → 账号安全 → 修改密码」和登录页的「忘记密码」都在打开表单时读取 UPMS 的当前规则，显示字符数、UTF-8 字节上限和所需字符类型。邮件重置需要已验证的邮箱及宿主的 [SMTP 配置](../loadup-boot/README.md#upms-密码强度)。

## 新增管理页面

1. 在 `src/views/<业务名>` 放置页面和对应的 `*.router.tsx`，通过默认导出注册 `AdminRouterItem`。
2. 配置 `meta.key`、`label`、`title` 与 `order`。详情页用 `hideInMenu` 控制菜单展示。用 `requiresSuperAdmin` 标记系统管理页面。业务页面设置 `requiresMenuGrant`，并在 UPMS 登记匹配 `meta.key` 的菜单资源路径。
3. 使用 `src/utils/upms.ts` 中的请求适配器接入后端，按统一业务报文处理成功、失败和分页。服务端执行资源授权。
4. 使用 `pnpm run lint` 检查页面和类型约定，连接本地后端检查页面入口和请求。

主题可通过 `src/store/config.ts` 切换预设、浅色或深色显示并保存界面偏好。

## 发布

```sh
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
pnpm run preview
```

发布 `dist/`。生产环境将 `/api/` 路由到对应后端，其他前端导航路径回退到 `index.html`。构建时设置 `VITE_LOADUP_TENANT_CODE`，与目标后端的部署代码一致。`LOADUP_API_TARGET` 仅配置 Vite 开发代理。Vercel 安装、构建和前端回退见 [vercel.json](vercel.json)，使用 Corepack 的项目可设置 `ENABLE_EXPERIMENTAL_COREPACK=1`。

## 许可证与致谢

MIT © [Yujian Xue](https://yujay.dev)。

界面使用 [Ant Design](https://ant.design/)、[React Router](https://reactrouter.com/)、[Vite](https://vite.dev/) 和 [Zustand](https://github.com/pmndrs/zustand)。

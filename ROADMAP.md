# LoadUp Admin Roadmap

2026-10-19 已接入独立 CI、根 npm/GitHub Actions Dependabot，补齐 apps/docs workspace 锁文件并保留冻结安装；修复表格行泛型和格式检查阻塞。远程验收与未完成事项如下。

- [ ] 首次 GitHub CI 验收 Node 22.19.0 / Ubuntu 环境，并配置必需检查 Admin Quality, Tests and Build；本地使用 Node 24.4.0，不能代替远程运行。
- [ ] 与后端独立部署环境进行账号、权限、商户、合约等页面的端到端验收。
- [ ] 复核 pnpm audit 与 README 中历史依赖告警的最新修复状态；本轮未运行安全审计。

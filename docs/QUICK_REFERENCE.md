# 开发者快速入口

这份文档只保留当前可直接使用的速查入口：目录入口、常用命令、测试入口、关键服务/状态模块入口、手测入口、部署入口。

## 目录入口

```text
.
├── app/                  # 应用代码、依赖、开发命令
│   ├── app/              # 路由入口
│   ├── src/              # 业务实现、服务、状态模块
│   ├── assets/           # 静态资源
│   ├── package.json      # npm scripts
│   └── app.json          # Expo 配置
├── backend/              # 后端服务
├── docs/                 # 项目文档
├── docker-compose.yml    # 部署编排
├── nginx.conf            # 反向代理配置
└── .env.example          # 环境变量模板
```

常看入口：

- `README.md`
- `docs/IMPLEMENTATION_SUMMARY.md`
- `docs/QUICK_REFERENCE.md`
- `docs/MANUAL_TEST_PLAN.md`
- `docs/BACKEND_DEPLOYMENT.md`

## 常用命令

前端命令都在 `app/` 目录执行。

```bash
(cd app && npm start)
(cd app && npm run ios)
(cd app && npm run android)
(cd app && npm run web)
(cd app && npm run lint)
(cd app && npm run typecheck)
(cd app && npm run verify)
```

## 测试入口

前端测试都在 `app/` 目录执行，当前可用入口包括：

- 最小闭环：`(cd app && npm run verify)`
- 通用 Jest：`(cd app && npm test)`、`(cd app && npm run test:watch)`、`(cd app && npm run test:coverage)`
- 账号与设置：`(cd app && npm run test:frontend:auth)`、`(cd app && npm run test:frontend:settings)`
- 内容与浏览：`(cd app && npm run test:frontend:tags)`、`(cd app && npm run test:frontend:home)`、`(cd app && npm run test:frontend:editor-image)`
- 应用核心手工流：`(cd app && npm run test:maestro:app-core)`

## 关键服务/状态模块入口

- 启动与应用接线：`app/src/services/appBootstrapService.ts`
- 网络与后端连接：`app/src/services/apiClient.ts`
- 同步链路：`app/src/services/syncBootstrapService.ts`、`app/src/services/cloudSyncService.ts`、`app/src/store/syncStore.ts`
- 首页与内容状态：`app/src/services/homeUploadSyncOrchestration.ts`、`app/src/store/entryStore.ts`、`app/src/store/mediaStore.ts`
- 设置与账户状态：`app/src/services/backupService.ts`、`app/src/store/settingsStore.ts`、`app/src/store/authStore.ts`

## 当前手测入口

- 仓库级手测入口：`docs/MANUAL_TEST_PLAN.md`
- 应用内专项手测入口：`app/TEST_PLAN.md`

## 部署入口

根目录部署入口：

- `docker-compose.yml`
- `nginx.conf`
- `.env.example`
- `docs/BACKEND_DEPLOYMENT.md`

# MemoryCapsule

`MemoryCapsule` 是仓库名，当前移动端应用名为 `DayCapsule`。

- 应用名称：`DayCapsule`
- Expo slug：`daycapsule`
- iOS bundle identifier：`com.memorycapsule.app`
- Android package：`com.memorycapsule.app`

## 仓库是什么

这是一个包含移动端应用、后端服务和项目文档的仓库。

- `app/`：Expo / React Native 移动端应用
- `backend/`：后端服务
- `docs/`：当前实现对应的入口文档与说明

当前移动端应用支持文字、照片、语音三类记录，并使用 Expo Router、SQLite、MMKV 等能力构建。

## 目录怎么走

```text
.
├── app/                         # DayCapsule 应用代码、依赖与开发命令
│   ├── app/                     # Expo Router 路由入口
│   ├── src/                     # 业务实现、组件、状态与数据层
│   ├── assets/                  # 图片、图标、字体等静态资源
│   ├── package.json             # 应用依赖与 npm scripts
│   └── app.json                 # Expo 应用配置
├── backend/                     # 仓库内后端服务
├── docs/                        # README 进一步指向的项目文档
├── docker-compose.yml           # 根目录部署编排文件
├── nginx.conf                   # 根目录反向代理配置
└── .env.example                 # 根目录环境变量模板
```

根目录职责：承载仓库级入口说明，以及应用与部署共用的顶层配置资产。

`app/` 目录职责：承载 `DayCapsule` 应用本体；日常安装依赖、启动开发环境、类型检查和测试，均在该目录执行。

`backend/` 承载仓库内后端服务实现；`docs/` 放置项目入口文档。

## 最少必要启动步骤

前提：

- Node.js 20+
- npm 10+
- iOS 开发需要 Xcode 15+（仅 macOS）
- Android 开发需要 Android Studio + JDK 17

注意：项目依赖原生模块，不支持 Expo Go，需要使用原生运行方式或 custom dev client。

```bash
git clone https://github.com/cooper/MemoryCapsule.git
cd MemoryCapsule
cd app
npm install
npm start
```

高频开发命令：

```bash
cd app

npm start
npm run ios
npm run android
npm run web
npm run lint
npm run typecheck
npm test
```

细分测试脚本和补充命令位于 `docs/QUICK_REFERENCE.md`。

## 相关入口

| 文档 | 当前内容 |
| --- | --- |
| [`docs/IMPLEMENTATION_SUMMARY.md`](docs/IMPLEMENTATION_SUMMARY.md) | 仓库当前实现概览 |
| [`docs/QUICK_REFERENCE.md`](docs/QUICK_REFERENCE.md) | 开发命令、测试入口与关键模块入口 |
| [`docs/MANUAL_TEST_PLAN.md`](docs/MANUAL_TEST_PLAN.md) | 当前手动测试入口 |
| [`docs/BACKEND_DEPLOYMENT.md`](docs/BACKEND_DEPLOYMENT.md) | 当前后端部署事实与相关文件 |

## 许可证

[MIT](./LICENSE) © 2026 cooper

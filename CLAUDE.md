# CLAUDE.md

此文档为 AI 助手提供项目关键上下文。详细内容见下方文档索引。

## Process Requirements
- 所有走brainstorming技能的需求，默认调用 superpowers中创建 worktree的技能,所有修改在 worktree 中实现

## 项目概览

`MemoryCapsule` 是仓库名，当前移动端应用名为 `DayCapsule`。

| 项目 | 值 |
|------|----|
| 框架 | Expo SDK 54 (React Native 0.81.5) |
| 语言 | TypeScript 5.9 |
| 路由 | Expo Router 6.0 |
| 状态管理 | Zustand 5.0 |
| 样式 | NativeWind 4.0 (Tailwind CSS) |
| 主存储 | Expo SQLite v16 |
| KV 存储 | React Native MMKV v4.1.1 |
| 运行环境 | EAS Build / custom dev client（不兼容 Expo Go） |

---

## ⚠️ 重要提示

1. **应用开发命令在 `app/` 目录执行**
2. **不能在 Expo Go 中运行** — 项目依赖原生模块，需使用原生运行方式或 custom dev client
3. **使用路径别名** — `@/src/...` 代替相对路径
4. **样式默认遵循 NativeWind / `className` 方案**
5. **状态管理以 Zustand store 为主**
---

## 当前功能

- ✅ 文字 / 照片 / 语音 三种记录类型
- ✅ 本地数据存储、内容浏览、搜索与筛选
- ✅ 媒体处理、上传队列、恢复与校验
- ✅ 账户状态、云同步与后端接入能力
- ✅ 本地备份、手测入口与分场景测试脚本

---

## 文档索引

| 文档 | 用途 |
|------|------|
| [`docs/QUICK_REFERENCE.md`](docs/QUICK_REFERENCE.md) | 开发命令、测试入口、关键模块入口 |
| [`docs/IMPLEMENTATION_SUMMARY.md`](docs/IMPLEMENTATION_SUMMARY.md) | 当前实现概览 |
| [`docs/MANUAL_TEST_PLAN.md`](docs/MANUAL_TEST_PLAN.md) | 当前手动测试入口 |
| [`docs/BACKEND_DEPLOYMENT.md`](docs/BACKEND_DEPLOYMENT.md) | 当前后端部署事实与相关文件 |

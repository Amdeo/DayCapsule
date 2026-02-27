# CLAUDE.md

此文档为 AI 助手提供项目关键上下文。详细内容见下方文档索引。

## 项目概览

**MemoryCapsule** — 现代化生活记录应用（文字 / 照片 / 语音）

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

1. **所有命令必须在 `app/` 目录中执行**
2. **不能在 Expo Go 中运行** — MMKV 需要原生模块，必须 EAS Build
3. **使用路径别名** — `@/src/...` 代替相对路径
4. **样式使用 NativeWind** — 用 `className`，避免 `StyleSheet`
5. **状态管理用 Zustand** — 避免 Redux 或过度使用 Context API
6. **MMKV v4 API** — `createMMKV()` 工厂函数，删除用 `remove(key)`
7. **分页加载** — `loadEntries()` 重置首页，`loadMore()` 追加下一页
8. **双写策略** — 写入 entry 时同时写 `entries.tags`（JSON）和 `entry_tags` 表

---

## 当前功能

- ✅ 文字 / 照片 / 语音 三种记录类型
- ✅ SQLite 结构化存储（游标分页，每页 20 条）
- ✅ 无限滚动 Timeline + 标签系统（AND 过滤）
- ✅ 全文搜索 + 按类型 / 日期过滤
- ✅ MMKV 设置存储 + 自动备份
- ✅ 数据迁移（AsyncStorage → SQLite，幂等）
- ✅ TypeScript 严格类型（零 tsc 错误）+ 单元测试（35 个用例）

---

## 文档索引

| 文档 | 用途 |
|------|------|
| [`docs/QUICK_REFERENCE.md`](docs/QUICK_REFERENCE.md) | API 用法、项目结构、开发命令、FAQ |
| [`docs/IMPLEMENTATION_SUMMARY.md`](docs/IMPLEMENTATION_SUMMARY.md) | 存储架构、设计决策、三阶段重构详情 |
| [`docs/MANUAL_TEST_PLAN.md`](docs/MANUAL_TEST_PLAN.md) | 28 个手动测试用例 |

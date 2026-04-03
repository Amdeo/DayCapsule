# CLAUDE.md

此文档为 AI 助手提供项目关键上下文。详细内容见下方文档索引。

## Process Requirements
- 小问题，不要触发 superpowers，其他所有走brainstorming技能的需求，默认调用 superpowers中创建 worktree的技能,所有修改在 worktree 中实现

## Agent 友好编码规则

### 文件规模上限
- 组件 / Hook 文件：≤ 200 行
- Service 文件：≤ 300 行
- Store 文件：≤ 250 行
- 样式文件（`.styles.ts`）：≤ 300 行，超过则按子组件拆分
- 纯工具文件：≤ 250 行，单文件导出 ≤ 12 个

### 函数规模
- 单个函数体：≤ 50 行
- React 组件 JSX return：≤ 60 行，超过则提取子组件
- 嵌套深度：≤ 3 层（`if` / `try` / `callback` 各算一层）

### 路由文件规则（`app/` 目录）
- 路由文件只做 JSX 组装，**不定义业务逻辑函数**
- 业务流程放在 `src/services/` 或 `src/components/<screen>/useXxxController.ts` 中
- DI 接口和测试辅助函数（`...ForTest`）随对应 service 文件存放，不放路由文件

### 拆分模式
- 大 service（> 300 行）→ 子目录 + 门面 re-export（如 `services/voice/voiceRecorder.ts` + `services/voiceService.ts`）
- 大 store（> 250 行）→ Zustand slice 模式（`store/__internal__/xxxSlice.ts`）
- 大组件 → 已有门面模式（`ComponentName.tsx` 壳 + `component-name/` 子目录）继续沿用

### 类型安全
- 禁止 `catch (e: any)`，使用 `catch (e: unknown)` + `instanceof` 或类型守卫
- 禁止 `@ts-ignore` / `@ts-expect-error`（当前已零，保持）
- Reanimated 动画值使用 `SharedValue<T>` 而非 `any`

### 单一职责
- 一个文件只做一件事：不混合 UI 构建与业务逻辑
- 数据库层（`database/`）不导入任何 store（已做到，保持）
- store action 中不包含复杂业务逻辑，委托给 service
- service 不直接调用 `storeXxx.getState()`，通过参数注入或返回值传递状态

---

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

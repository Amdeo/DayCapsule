<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Repository Guidelines

## Project Structure & Module Organization
MemoryCapsule 采用分层 monorepo：`app/` 承载 React Native 客户端，`backend/` 保存同步/服务模拟，`UI/` 管理设计令牌与 Storybook，`docs/` 与 `specs/` 提供规范。核心源码位于 `app/src`，按 `features/`、`services/`、`store/`、`ui/`、`app/` 划分；测试位于 `app/tests` 并镜像源码层级。新增功能需同时更新 `docs` 中的架构描述并在 `specs` 内登记任务，确保可追溯性。

## Build, Test & Development Commands
使用 Node ≥18 与 npm 9。`npm install` 装载依赖；`npm start` 启动 Metro bundler；`npm run ios` / `npm run android` 分别在模拟器运行。`npm test`, `npm test:watch`, `npm test:coverage` 执行 Jest 单测、watch 模式与覆盖率报告。`npm run lint`, `npm run lint:fix`, `npm format`, `npm typecheck` 维持静态质量。`npm run build` 产出发布 bundle，`npm run pod` 统一安装 iOS 原生依赖，`npm run clean` 清理缓存与 Metro watchman 状态。

## Coding Style & Naming Conventions
代码全部使用 TypeScript 5.x 与 React Native 0.74。保持 Prettier 默认 2 空格缩进、单引号与尾随逗号；ESLint 基于 `@react-native/eslint-config`，CI 中禁止警告。避免裸露 `any`，必要时以窄化类型（如 `UnknownRecord`）封装。目录使用 kebab-case（`lifelog-timeline`），组件/类/枚举为 PascalCase，hook 以 `useCamelCase` 开头，Redux selectors 使用 `selectFoo`. Feature 文件夹下统一放置 `slice.ts`, `selectors.ts`, `types.ts`。

## Testing Guidelines
Jest + `@testing-library/react-native` 负责单测，文件命名 `*.test.ts(x)` 并与实现同级。修改 store、数据层或 hook 时要求语句覆盖率 ≥80%，以 `npm test:coverage` 验证。端到端场景依赖 Detox：`npm test:e2e:ios` / `npm test:e2e:android`，若新增复杂导航或传感器交互，请附运行日志或录像链接。CI 只接受绿灯构建；如需跳过测试必须在 PR 中写明原因与后续计划。

## Commit & Pull Request Guidelines
遵循 Conventional Commits（示例：`feat: add lifelog timeline filters`），可在描述中补充简短中文说明。禁止 `git commit -a -m "update"` 之类模糊信息。PR 描述需覆盖：变更动机、关键实现、验证命令、潜在回归点；若涉及 UI，请附截图或录屏。关联任务使用 `specs/<id>` 或 issue 链接。提交前确保 `npm run lint`、`npm test`、必要的 Detox 套件全部通过，禁止强制推送覆盖他人历史，等待评审通过后再合并。

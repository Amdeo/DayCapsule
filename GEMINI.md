# MemoryCapsule Gemini 上下文指南

## 项目概览
**MemoryCapsule** 是一个基于 React Native 的“生活日志”应用，旨在帮助用户通过照片、语音和文字捕捉和回顾生活瞬间。项目核心强调：
*   **极速记录**: ≤3 次点击即可完成捕捉。
*   **离线优先**: 强大的离线能力，数据本地存储。
*   **隐私安全**: 本地存储 + AES-256-GCM 加密。
*   **丰富体验**: 多维度的回顾时间线。

## 关键技术栈
*   **框架:** React Native 0.74
*   **语言:** TypeScript 5.x
*   **状态管理:** Redux Toolkit
*   **数据库:** SQLite + FTS5 (支持高性能离线全文搜索)
*   **UI 组件库:** React Native Paper
*   **测试框架:** Jest (单元测试), Detox (端到端测试)
*   **加密:** AES-256-GCM

## 目录结构说明
*   `app/`: React Native 应用的主代码目录。
    *   `src/features/`: 按功能划分的业务模块。
    *   `src/services/`: 业务逻辑封装及外部服务（API，数据库层）。
    *   `src/store/`: Redux store 状态管理配置。
    *   `src/ui/`: 通用的、可复用的 UI 组件。
    *   `e2e/`: Detox 端到端测试脚本。
*   `specs/`: 功能需求规范和计划文档（如 `001-lifelog-capture`）。
*   `docs/`: 项目文档（快速入门指南，性能基准测试，环境设置）。
*   `UI/`: 视觉设计参考图和相关资源。

## 开发工作流

### 1. 环境设置与安装
当前工作目录需切换至 `app/`:
```bash
npm install
cd ios && pod install && cd ..
```

### 2. 运行应用
*   **启动 Metro 服务 (Bundler):** `npm start`
*   **运行 Android 版:** `npm run android`
*   **运行 iOS 版:** `npm run ios`

### 3. 测试与质量保证
*   **运行单元测试:** `npm test`
*   **代码风格检查 (Lint):** `npm run lint`
*   **iOS 端到端测试:** `npm run test:e2e:ios`
*   **Android 端到端测试:** `npm run test:e2e:android`

## 代码规范与约定
*   **TypeScript:** 严格执行类型检查，严禁使用 `any`。
*   **代码风格:** 必须遵循 `app/` 目录下现有的 Prettier 和 ESLint 配置。
*   **架构设计:** 采用“功能优先 (Feature-first)”的目录结构。业务逻辑必须与 UI 组件分离。
*   **性能要求:** 关键操作响应时间应控制在 2 秒以内。在时间线等长列表中，需合理使用 `useMemo` 和 `useCallback` 避免不必要的重渲染。
*   **隐私原则:** 用户数据默认本地加密存储。未经用户明确授权或操作，严禁将敏感数据上传至外部服务器。

## 规范工作流 (Spec Workflow)
新功能的开发需遵循 `.spec-workflow` 目录中定义的流程。请查阅 `specs/` 目录以获取当前正在进行的特性分支信息。
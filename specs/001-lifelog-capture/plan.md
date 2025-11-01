# Implementation Plan: LifeLog 多模态记录

**Branch**: `001-lifelog-capture` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-lifelog-capture/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

围绕 React Native 移动端应用交付离线优先的生活记录体验：多模态输入（拍照、文字、语音转写）、本地 SQLite 元数据与文件存储、AI 标签本地推理、时间线多视图展示与高速搜索。计划采用 Redux Toolkit 管理状态、React Native Paper 构建 UI，组合虚拟滚动、懒加载和缩略图缓存满足 <2 秒交互目标，并为未来云同步预留扩展位。

## Technical Context

**Language/Version**: TypeScript 5.x（React Native 0.74 runtime）  
**Primary Dependencies**: React Native、React Native Paper、Redux Toolkit、React Navigation 6、react-native-camera、react-native-geolocation-service、React Native Maps、react-native-fs、react-native-sqlite-storage、腾讯云 ASR SDK、百度图像识别 SDK、react-native-permissions  
**Storage**: SQLite（记录元数据）、AsyncStorage（轻量设置）、设备文件系统/相册（媒体）、安全密钥库封装加密密钥  
**Testing**: Jest + React Native Testing Library（单元/组件），Detox（E2E 核心流程），自定义性能脚本（Metro + hermes-profile）、SQLite 基准脚本  
**Target Platform**: iOS 15+ 与 Android 12+（React Native 跨平台构建）  
**Project Type**: 移动应用（主工程 app/，预留 backend/ Node.js 服务）  
**Performance Goals**: 主要交互 p95 < 2 秒；时间线滚动维持 60 FPS；语音转写总时延 ≤ 录音时长 20%；10k 记录搜索首屏 < 2 秒  
**Constraints**: 离线优先、AES-256 本地加密、敏感日志脱敏、深色模式 & 字体调节、单次录音 30s-5min、最大 9 张照片/记录、空间不足需提醒  
**Scale/Scope**: 单用户年 10,000+ 条记录；MVP 聚焦本地能力并为云同步扩展做接口抽象

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] 模块划分、依赖与接口边界已明确，高复杂度代码具备拆分计划。（见 “Project Structure” 与 “Phase 1 Architecture”）
- [x] 列出全部关键功能，并为每项指定必备的单元测试范围与负责人。（见 “Phase 2 Tasks Overview”）
- [x] 提供核心流程的 <2 秒加载与 ≤3 次点击验证方案及度量方法。（见 “Testing & Validation Plan”）
- [x] 定义在 ≥10,000 条记录场景下的性能预算、基准脚本或监控策略。（见 “Performance & Benchmarking”）
- [x] 描述本地优先存储、静态数据加密与日志脱敏方案。（见 “Security & Privacy Design”）
- [x] 明确深色模式、字体调节和可访问性支持的实现路径。（见 “UX & Accessibility Strategy”）

## Project Structure

### Documentation (this feature)

```text
specs/001-lifelog-capture/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # 由 /speckit.tasks 生成
```

### Source Code (repository root)

```text
app/
├── src/
│   ├── app/                   # 根 providers、导航、主题
│   ├── features/
│   │   ├── capture/           # 拍照/文字输入 UI 与逻辑
│   │   ├── voice/             # 语音录制、转写与音频存储
│   │   ├── timeline/          # 日/周/月/年视图组件
│   │   ├── search/            # 搜索、筛选、导出
│   │   └── settings/          # 权限、隐私、外观
│   ├── services/
│   │   ├── storage/           # SQLite/文件系统、加密封装
│   │   ├── sync/              # 待同步队列、网络监测
│   │   ├── ai/                # 本地图像识别 + ASR 包装
│   │   └── telemetry/         # 性能指标、日志脱敏
│   ├── ui/                    # 通用卡片、标签、图表
│   ├── hooks/                 # 权限、聚焦、主题 hook
│   ├── store/                 # Redux slices、selectors、middleware
│   └── utils/                 # 加密、格式化、定位工具
├── ios/
├── android/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/

backend/                       # 预留 Node.js 同步服务骨架
└── README.md
```

**Structure Decision**: 采取 feature-first + services 分层以符合模块化宪章要求，服务层隔离外部依赖（AI、存储、同步），Redux 层统一状态管理；tests 目录按单元/集成/E2E 分类，便于针对关键功能实施必备单元测试与性能基准。

## Complexity Tracking

> **目前无宪章违反项，留空。**

## Phase 0 – Research Backlog

1. **腾讯云 ASR 本地/离线策略**：确认 SDK 是否支持离线缓存、断网重试方案及费用结构；比较讯飞语音 API 作为备选。
2. **百度图像识别本地推理可行性**：验证自研本地模型 or SDK 的设备端部署选项、模型大小、离线使用授权；如需自建模型，评估 TensorFlow Lite / ONNX Runtime。
3. **React Native 相机性能优化**：调研 react-native-camera 在多照片批量拍摄的最佳实践（缓存、分辨率设置、拍摄后写入文件系统流程）。
4. **SQLite 10k+ 数据性能基准**：搜集 React Native SQLite 在大数据量下的索引策略、分页查询与全文搜索（FTS5）的可用性。
5. **隐私合规 & 密钥管理**：研究 iOS Keychain、Android Keystore 与第三方加密库组合，确定 AES-256 密钥生成、轮换与备份策略。

输出：完成以上研究后在 `research.md` 记录决策、理由与备选方案；未解决问题必须转化为 `/speckit.clarify` 或计划风险。

## Phase 1 – Architecture & Design

### Phase 1 Architecture

- **模块边界**：features（capture/voice/timeline/search/settings）负责 UI + 业务流程；services（storage/sync/ai/telemetry）封装外部能力；store 维护状态，使用 Redux slices（entries, mediaQueue, timelineFilters, auth）。
- **数据流**：
  - Capture/Voice → services.storage 写入 SQLite + 媒体目录，并通过 services.sync 标记 `pending` 同步状态。
  - services.ai 在本地运行图像标签推理，并将建议标签写回 store。
  - Timeline/Search 从 SQLite 读取分页数据，使用 memoized selectors + 虚拟滚动组件输出。
- **接口边界**：service 层暴露 TypeScript 接口，后续云同步服务以相同接口替换实现；AI 服务抽象 `TagSuggestionProvider`，便于更换模型。

### Security & Privacy Design

- 媒体文件存储在应用私有目录 + AES-256 加密；密钥由平台安全存储提供并定期轮换。
- 离线记录添加 “待同步” 状态，日志仅记录哈希 ID，禁止明文内容出现在日志。
- 权限管理：使用 react-native-permissions 提前检查并引导到设置界面；无权限时提供手动补录 UI。

### Performance & Benchmarking

- SQLite 建立组合索引（时间戳、标签、Mood、位置），使用 FTS5 支撑全文搜索。
- 列表组件统一采用 FlashList/RecyclerListView，实现惰性加载与缩略图缓存（200x200 预处理）。
- 性能脚本：构建 10k 数据集模拟，通过 Detox 场景录制 + hermes-profile 收集 p95。

### UX & Accessibility Strategy

- React Native Paper 主题支持浅/深色切换，字体通过系统动态字体 + 手动调节（3 档）。
- 所有关键按钮/表单组件提供 accessibilityLabel、语音提示；时间线图表提供文本摘要。
- 空状态设计：首次使用显示教程卡片，搜索无结果给出优化建议。

### Testing & Validation Plan

- **单元测试**：Redux slices、存储适配器、AI 标签建议模块的核心逻辑。
- **集成测试**：拍照→保存、语音转写→保存、时间线筛选流程，利用 React Native Testing Library + mocked services。
- **E2E**：Detox 脚本覆盖拍照记录、语音记录、Timeline 浏览与搜索。
- **性能验证**：CI 运行 10k 数据脚本，记录 p95 指标；构建前后对比。

## Phase 2 – Task Overview（将由 `/speckit.tasks` 细化）

- Capture 模块：相机桥接、照片存储、标签输入、离线提示。
- Voice 模块：录音界面、腾讯云 ASR 接入、转写编辑、音频回放。
- Timeline & Search：FlashList/Recycler 渲染、筛选器、统计视图与提醒。
- Storage & Sync 服务：SQLite schema、FTS5、待同步队列、空间监控。
- AI 服务：本地图像识别模型集成、标签建议、模型更新策略。
- 安全与设置：AES 加密封装、密钥管理、锁屏/生物识别、字体/主题设置。
- QA & Observability：日志脱敏、性能指标埋点、测试脚本与 CI 集成。

## Phase 0 Deliverables

- `/specs/001-lifelog-capture/research.md`：记录各技术决策、依据与备选。
- 更新 plan.md 技术上下文与架构方案（当前文件）。

## Phase 1 Deliverables

- `data-model.md`：实体字段、关系、状态机、索引策略。
- `contracts/lifelog-api.yaml`：同步/备份服务 OpenAPI（占位供未来实现）。
- `quickstart.md`：环境准备、运行、测试、性能基准指南。
- 运行 `.specify/scripts/bash/update-agent-context.sh codex` 同步技术栈。

## Risks & Mitigations

- **ASR/图像识别离线能力不足** → 研究阶段验证缓存策略，必要时提前规划本地模型或混合方案。
- **大规模媒体占用存储** → 实施空间阈值监控与用户提示；提供批量导出/清理指南。
- **性能退化** → 建立性能基准脚本，CI 必跑；使用懒加载、缩略图缓存控制资源。
- **权限被拒** → 提供回退流程（手动补录、离线缓存），并在设置页突出权限用途。

## Constitution Check（Post-Design）

Phase 1 设计完成后再次审视六项栈门槛：模块边界、关键功能测试、<2 秒体验验证、10k 数据性能策略、本地隐私与日志脱敏、深色模式与字体调节方案均已在上文对应章节落实，无新增风险。

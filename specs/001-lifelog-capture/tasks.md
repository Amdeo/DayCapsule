# Tasks: LifeLog 多模态记录

**Input**: Design documents from `/specs/001-lifelog-capture/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/lifelog-api.yaml

**Tests**: 根据 spec.md 要求，本功能需要单元测试、集成测试和 E2E 测试覆盖核心流程。

**Organization**: 任务按用户故事分组，每个故事可独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 任务所属用户故事（US1, US2, US3, US4）
- 包含精确文件路径

## Path Conventions

- 移动应用项目：`app/src/`、`app/tests/` 位于仓库根目录
- 预留后端服务：`backend/` 用于未来云同步

---

## Phase 1: Setup（共享基础设施）

**Purpose**: 项目初始化和基础结构搭建

- [x] T001 创建 React Native 项目结构，按 plan.md 中的目录组织（app/src/features、services、store、ui、hooks、utils）
- [x] T002 初始化 TypeScript 5.x 配置，设置 tsconfig.json 支持 React Native 0.74
- [x] T003 [P] 安装核心依赖：React Native Paper、Redux Toolkit、React Navigation 6、react-native-permissions
- [x] T004 [P] 配置 ESLint、Prettier 和 TypeScript 检查工具
- [x] T005 [P] 设置 Jest + React Native Testing Library 测试环境
- [x] T006 [P] 配置 Detox E2E 测试框架（iOS 和 Android）
- [x] T007 创建 .env.sample 文件，定义腾讯云 ASR 和百度 EasyDL 凭证占位符
- [x] T008 [P] 设置 iOS 和 Android 原生项目配置（权限声明、Info.plist、AndroidManifest.xml）
- [x] T009 创建 app/src/app/App.tsx 根组件，集成 Redux Provider 和 React Navigation
- [x] T010 [P] 实现主题系统 app/src/app/theme.ts，支持浅色/深色模式切换

---

## Phase 2: Foundational（阻塞性前置条件）

**Purpose**: 所有用户故事依赖的核心基础设施，必须在任何用户故事开始前完成

**⚠️ CRITICAL**: 此阶段完成前，不能开始任何用户故事工作

- [x] T011 实现 SQLite 数据库初始化 app/src/services/storage/database.ts，创建 LifeLogEntry、MediaAttachment、Tag、entry_tags、ReminderLog、SyncQueueItem 表
- [x] T012 [P] 创建 SQLite 索引和 FTS5 虚拟表 app/src/services/storage/migrations.ts
- [x] T013 [P] 实现加密服务 app/src/services/storage/encryption.ts，使用 react-native-keychain 管理 AES-256-GCM 密钥
- [x] T014 [P] 实现文件系统服务 app/src/services/storage/fileSystem.ts，管理媒体文件存储和缩略图生成
- [x] T015 实现权限管理服务 app/src/services/permissions.ts，封装 react-native-permissions 检查和请求逻辑
- [x] T016 [P] 创建 Redux store 配置 app/src/store/index.ts，集成 Redux Toolkit 和持久化中间件
- [x] T017 [P] 实现 entries slice app/src/store/slices/entriesSlice.ts，管理记录状态（CRUD、同步状态）
- [x] T018 [P] 实现 settings slice app/src/store/slices/settingsSlice.ts，管理主题、字体、权限状态
- [x] T019 [P] 实现日志脱敏工具 app/src/services/telemetry/logger.ts，确保敏感内容不出现在日志
- [x] T020 [P] 创建通用 UI 组件库：LoadingIndicator、ErrorBoundary、EmptyState 在 app/src/ui/
- [x] T021 实现 React Navigation 导航结构 app/src/app/navigation.tsx（Tab Navigator + Stack Navigator）
- [x] T022 [P] 创建性能监控工具 app/src/services/telemetry/performance.ts，记录 p95 响应时间
- [x] T023 [P] 实现网络状态监听 app/src/services/sync/networkMonitor.ts，用于离线/在线切换检测

**Checkpoint**: 基础设施就绪 - 用户故事实现现在可以并行开始

---

## Phase 3: User Story 1 - 拍照/文字快记 (Priority: P1) 🎯 MVP

**Goal**: 用户可在 2 秒内完成拍照或文字记录，并为内容打标签与心情

**Independent Test**: 从首页启动记录 → 完成拍照上传或文字保存，全流程 ≤3 次主要点击，首屏/提交反馈 <2 秒

### 测试 for User Story 1

> **NOTE: 先编写测试，确保测试失败后再实现功能**

- [x] T024 [P] [US1] 创建拍照记录集成测试 app/tests/integration/capture/photoCapture.test.ts
- [x] T025 [P] [US1] 创建文字记录集成测试 app/tests/integration/capture/textCapture.test.ts
- [x] T026 [P] [US1] 创建 E2E 测试：拍照流程 app/tests/e2e/capturePhoto.e2e.ts（Detox）
- [x] T027 [P] [US1] 创建 E2E 测试：文字输入流程 app/tests/e2e/captureText.e2e.ts（Detox）

### 实现 for User Story 1

- [x] T028 [P] [US1] 安装 react-native-camera 和 react-native-image-picker 依赖
- [x] T029 [P] [US1] 实现相机服务 app/src/services/camera/cameraService.ts，封装拍照和相册选择逻辑
- [x] T030 [P] [US1] 实现地理位置服务 app/src/services/location/locationService.ts，使用 react-native-geolocation-service
- [x] T031 [P] [US1] 实现天气服务 app/src/services/weather/weatherService.ts，获取本地天气信息
- [x] T032 [US1] 创建 CaptureScreen 主界面 app/src/features/capture/screens/CaptureScreen.tsx
- [x] T033 [P] [US1] 实现照片选择器组件 app/src/features/capture/components/PhotoPicker.tsx（支持最多 9 张）
- [x] T034 [P] [US1] 实现文字编辑器组件 app/src/features/capture/components/TextEditor.tsx（富文本支持）
- [x] T035 [P] [US1] 实现标签输入组件 app/src/features/capture/components/TagInput.tsx
- [x] T036 [P] [US1] 实现心情选择器组件 app/src/features/capture/components/MoodPicker.tsx（emoji 选择）
- [x] T037 [US1] 实现记录保存逻辑 app/src/features/capture/hooks/useSaveEntry.ts，集成 SQLite 和文件系统
- [x] T038 [US1] 实现草稿自动保存功能 app/src/features/capture/hooks/useAutoSave.ts
- [x] T039 [P] [US1] 实现缩略图生成服务 app/src/services/storage/thumbnailGenerator.ts（200x200）
- [x] T040 [US1] 集成权限检查流程到 CaptureScreen，处理相机/定位权限被拒场景
- [x] T041 [US1] 添加加载状态和错误处理到 CaptureScreen
- [x] T042 [US1] 实现记录创建性能埋点，验证 <2 秒目标

**Checkpoint**: 此时 User Story 1 应完全功能可用且可独立测试

---

## Phase 4: User Story 2 - 语音记录与转写 (Priority: P2)

**Goal**: 用户通过语音记录想法，系统实时转写文字并保存原始音频

**Independent Test**: 使用 30 秒与 5 分钟录音，验证录音开始响应 <1 秒；录音结束后 10 秒内完成转写

### 测试 for User Story 2

- [x] T043 [P] [US2] 创建语音录制集成测试 app/tests/integration/voice/voiceRecording.test.ts
- [x] T044 [P] [US2] 创建语音转写集成测试 app/tests/integration/voice/transcription.test.ts
- [x] T045 [P] [US2] 创建 E2E 测试：语音录制流程 app/tests/e2e/voiceCapture.e2e.ts（Detox）

### 实现 for User Story 2

- [x] T046 [P] [US2] 安装 react-native-audio-recorder-player 依赖
- [x] T047 [P] [US2] 集成腾讯云 ASR SDK，创建 app/src/services/ai/asrService.ts
- [x] T048 [P] [US2] 实现音频录制服务 app/src/services/voice/audioRecorder.ts（支持 30s-5min）
- [x] T049 [P] [US2] 实现音频文件管理 app/src/services/storage/audioStorage.ts，加密存储音频
- [x] T050 [US2] 创建 VoiceRecordScreen 界面 app/src/features/voice/screens/VoiceRecordScreen.tsx
- [x] T051 [P] [US2] 实现录音按钮组件 app/src/features/voice/components/RecordButton.tsx（长按录制）
- [x] T052 [P] [US2] 实现录音波形可视化组件 app/src/features/voice/components/WaveformVisualizer.tsx
- [x] T053 [P] [US2] 实现转写进度指示器 app/src/features/voice/components/TranscriptionProgress.tsx
- [x] T054 [US2] 实现语音转写逻辑 app/src/features/voice/hooks/useTranscription.ts
- [x] T055 [US2] 实现转写文本编辑功能 app/src/features/voice/components/TranscriptEditor.tsx
- [x] T056 [US2] 实现音频回放功能 app/src/features/voice/components/AudioPlayer.tsx
- [x] T057 [US2] 处理录音中断场景（来电、切换后台），保存已录制片段
- [x] T058 [US2] 实现离线录音缓存，联网后自动转写
- [x] T059 [US2] 添加语音记录性能埋点，验证转写时延 ≤ 录音时长 20%

**Checkpoint**: 此时 User Stories 1 和 2 应都能独立工作

---

## Phase 5: User Story 3 - 多维时间线回顾 (Priority: P2)

**Goal**: 用户快速浏览过去记录，可在日/周/月/年视图切换，查看缩略图、热度和统计

**Independent Test**: 在包含 ≥10,000 条记录的数据集中切换各视图，界面加载 <2 秒

### 测试 for User Story 3

- [x] T060 [P] [US3] 创建时间线视图集成测试 app/tests/integration/timeline/timelineViews.test.ts
- [x] T061 [P] [US3] 创建提醒功能集成测试 app/tests/integration/timeline/reminders.test.ts
- [x] T062 [P] [US3] 创建 E2E 测试：时间线浏览 app/tests/e2e/timelineBrowse.e2e.ts（Detox）
- [x] T063 [P] [US3] 创建性能测试脚本 app/tests/performance/timeline10k.perf.ts（10k 数据集）

### 实现 for User Story 3

- [ ] T064 [P] [US3] 安装 @shopify/flash-list 和 react-native-maps 依赖
- [x] T065 [P] [US3] 实现 timeline slice app/src/store/slices/timelineSlice.ts，管理视图状态和筛选器
- [x] T066 [P] [US3] 实现分页查询服务 app/src/services/storage/entryQueries.ts，支持日/周/月/年视图
- [x] T067 [US3] 创建 TimelineScreen 主界面 app/src/features/timeline/screens/TimelineScreen.tsx
- [x] T068 [P] [US3] 实现日视图组件 app/src/features/timeline/components/DayView.tsx（按小时分段卡片）
- [x] T069 [P] [US3] 实现周视图组件 app/src/features/timeline/components/WeekView.tsx（7 列点状）
- [x] T070 [P] [US3] 实现月视图组件 app/src/features/timeline/components/MonthView.tsx（日历热力图）
- [x] T071 [P] [US3] 实现年视图组件 app/src/features/timeline/components/YearView.tsx（统计概览）
- [x] T072 [P] [US3] 实现记录卡片组件 app/src/features/timeline/components/EntryCard.tsx（缩略图+摘要）
- [x] T073 [US3] 实现虚拟滚动优化，使用 FlashList 渲染大列表
- [x] T074 [P] [US3] 实现缩略图缓存策略 app/src/services/storage/thumbnailCache.ts
- [x] T075 [P] [US3] 实现视图切换器组件 app/src/features/timeline/components/ViewSwitcher.tsx
- [x] T076 [P] [US3] 实现"一年前的今天"提醒服务 app/src/services/reminders/reminderService.ts
- [x] T077 [US3] 实现提醒推送功能，集成本地通知
- [x] T078 [US3] 添加时间线加载性能埋点，验证 <2 秒目标
- [x] T079 [US3] 创建 10k 数据集生成脚本 app/tests/fixtures/seedData.ts

**Checkpoint**: 所有核心用户故事（US1-US3）现在应独立功能完整

---

## Phase 6: User Story 4 - 搜索与筛选 (Priority: P3)

**Goal**: 用户通过全文与语义搜索、标签、心情、地点、日期组合筛选定位特定记录

**Independent Test**: 在测试数据集中执行关键词、语义、标签+日期组合查询，结果列表首屏在 2 秒内呈现

### 测试 for User Story 4

- [x] T080 [P] [US4] 创建全文搜索集成测试 app/tests/integration/search/fullTextSearch.test.ts
- [x] T081 [P] [US4] 创建筛选器集成测试 app/tests/integration/search/filters.test.ts
- [x] T082 [P] [US4] 创建导出功能集成测试 app/tests/integration/search/export.test.ts
- [x] T083 [P] [US4] 创建 E2E 测试：搜索流程 app/tests/e2e/search.e2e.ts（Detox）

### 实现 for User Story 4

- [x] T084 [P] [US4] 实现 FTS5 全文搜索服务 app/src/services/storage/searchService.ts
- [x] T085 [P] [US4] 实现语义搜索服务 app/src/services/ai/semanticSearch.ts（本地向量匹配）
- [x] T086 [P] [US4] 实现 search slice app/src/store/slices/searchSlice.ts，管理搜索状态和历史
- [x] T087 [US4] 创建 SearchScreen 主界面 app/src/features/search/screens/SearchScreen.tsx
- [x] T088 [P] [US4] 实现搜索输入框组件 app/src/features/search/components/SearchBar.tsx（自动建议）
- [x] T089 [P] [US4] 实现筛选器面板组件 app/src/features/search/components/FilterPanel.tsx
- [x] T090 [P] [US4] 实现标签筛选器 app/src/features/search/components/TagFilter.tsx
- [x] T091 [P] [US4] 实现日期范围选择器 app/src/features/search/components/DateRangePicker.tsx
- [x] T092 [P] [US4] 实现心情筛选器 app/src/features/search/components/MoodFilter.tsx
- [x] T093 [P] [US4] 实现地点筛选器 app/src/features/search/components/LocationFilter.tsx（地图选择）
- [x] T094 [US4] 实现搜索结果列表 app/src/features/search/components/SearchResults.tsx（高亮匹配）
- [x] T095 [P] [US4] 实现导出服务 app/src/services/export/exportService.ts（PDF 和 Word 格式）
- [x] T096 [US4] 实现导出功能 UI app/src/features/search/components/ExportDialog.tsx
- [x] T097 [US4] 添加搜索性能埋点，验证首屏 <2 秒目标
- [x] T098 [US4] 实现搜索历史和热门标签展示

**Checkpoint**: 所有用户故事现在应独立功能完整

---

## Phase 7: AI 标签建议 (Cross-Cutting)

**Purpose**: 为拍照记录提供 AI 标签建议功能

- [ ] T099 [P] 集成百度 EasyDL TensorFlow Lite 模型到项目
- [x] T100 [P] 实现图像识别服务 app/src/services/ai/imageRecognition.ts
- [x] T101 实现 AI 标签建议逻辑 app/src/features/capture/hooks/useAITags.ts
- [x] T102 [P] 创建 AI 标签建议 UI 组件 app/src/features/capture/components/AITagSuggestions.tsx
- [x] T103 集成 AI 标签到 CaptureScreen，允许用户一键采纳或删除
- [x] T104 [P] 实现模型更新策略 app/src/services/ai/modelUpdater.ts

---

## Phase 8: 同步与数据管理 (Cross-Cutting)

**Purpose**: 实现离线优先同步和数据管理功能

- [x] T105 [P] 实现同步队列服务 app/src/services/sync/syncQueue.ts
- [x] T106 [P] 实现同步重试逻辑 app/src/services/sync/retryStrategy.ts（最多 5 次）
- [x] T107 实现同步状态管理 app/src/store/slices/syncSlice.ts
- [x] T108 [P] 实现云备份服务占位 app/src/services/sync/cloudBackup.ts（未来实现）
- [x] T109 [P] 实现空间监控服务 app/src/services/storage/storageMonitor.ts
- [x] T110 创建同步状态指示器 app/src/ui/SyncStatusIndicator.tsx
- [x] T111 [P] 实现批量导出/清理功能 app/src/features/settings/components/DataManagement.tsx

---

## Phase 9: 设置与安全 (Cross-Cutting)

**Purpose**: 实现用户设置、隐私锁定和安全功能

- [x] T112 创建 SettingsScreen 主界面 app/src/features/settings/screens/SettingsScreen.tsx
- [x] T113 [P] 实现主题切换组件 app/src/features/settings/components/ThemeSelector.tsx
- [x] T114 [P] 实现字体大小调节组件 app/src/features/settings/components/FontSizeSelector.tsx（3 档）
- [x] T115 [P] 实现权限管理界面 app/src/features/settings/components/PermissionsManager.tsx
- [x] T116 [P] 实现生物识别锁定服务 app/src/services/security/biometricAuth.ts
- [x] T117 [P] 实现密码锁定服务 app/src/services/security/passwordAuth.ts
- [x] T118 实现应用锁定逻辑 app/src/app/AppLock.tsx
- [x] T119 [P] 实现隐私设置界面 app/src/features/settings/components/PrivacySettings.tsx
- [x] T120 [P] 实现密钥轮换策略 app/src/services/storage/keyRotation.ts

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 跨用户故事的改进和完善

- [x] T121 [P] 实现空状态设计：首次使用教程卡片 app/src/ui/OnboardingCards.tsx
- [x] T122 [P] 实现搜索无结果优化建议 app/src/features/search/components/NoResultsHelper.tsx
- [x] T123 [P] 实现无障碍标签和语音提示（所有关键组件）
- [x] T124 [P] 实现时间线图表文本摘要（无障碍支持）
- [x] T125 代码审查和重构：确保模块化和类型安全
- [x] T126 [P] 性能优化：分析和优化关键路径
- [x] T127 [P] 更新 quickstart.md 文档，添加实际运行指南
- [x] T128 [P] 创建 README.md，包含项目概述和快速开始
- [x] T129 运行完整测试套件，确保所有测试通过
- [x] T130 运行 quickstart.md 验证流程
- [x] T131 安全加固：审查加密实现和日志脱敏
- [x] T132 [P] 创建性能基准报告模板

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - 阻塞所有用户故事
- **User Stories (Phase 3-6)**: 全部依赖 Foundational 阶段完成
  - 用户故事可并行进行（如果有足够人力）
  - 或按优先级顺序执行（P1 → P2 → P3）
- **AI Tags (Phase 7)**: 依赖 US1 完成
- **Sync (Phase 8)**: 依赖 US1 完成
- **Settings (Phase 9)**: 依赖 Foundational 完成
- **Polish (Phase 10)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成后可开始 - 无其他故事依赖
- **User Story 2 (P2)**: Foundational 完成后可开始 - 可独立测试
- **User Story 3 (P2)**: Foundational 完成后可开始 - 可独立测试
- **User Story 4 (P3)**: Foundational 完成后可开始 - 可独立测试

### Within Each User Story

- 测试必须先编写并失败，然后再实现
- 模型在服务之前
- 服务在端点/UI 之前
- 核心实现在集成之前
- 故事完成后再移至下一优先级

### Parallel Opportunities

- 所有标记 [P] 的 Setup 任务可并行运行
- 所有标记 [P] 的 Foundational 任务可并行运行（在 Phase 2 内）
- Foundational 阶段完成后，所有用户故事可并行开始（如果团队容量允许）
- 每个用户故事内标记 [P] 的测试可并行运行
- 每个故事内标记 [P] 的模型可并行运行
- 不同用户故事可由不同团队成员并行工作

---

## Parallel Example: User Story 1

```bash
# 同时启动 User Story 1 的所有测试：
Task: "创建拍照记录集成测试 app/tests/integration/capture/photoCapture.test.ts"
Task: "创建文字记录集成测试 app/tests/integration/capture/textCapture.test.ts"
Task: "创建 E2E 测试：拍照流程 app/tests/e2e/capturePhoto.e2e.ts"
Task: "创建 E2E 测试：文字输入流程 app/tests/e2e/captureText.e2e.ts"

# 同时启动 User Story 1 的所有服务：
Task: "实现相机服务 app/src/services/camera/cameraService.ts"
Task: "实现地理位置服务 app/src/services/location/locationService.ts"
Task: "实现天气服务 app/src/services/weather/weatherService.ts"
```

---

## Implementation Strategy

### MVP First (仅 User Story 1)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键 - 阻塞所有故事）
3. 完成 Phase 3: User Story 1
4. **停止并验证**: 独立测试 User Story 1
5. 如果就绪则部署/演示

### Incremental Delivery

1. 完成 Setup + Foundational → 基础就绪
2. 添加 User Story 1 → 独立测试 → 部署/演示（MVP！）
3. 添加 User Story 2 → 独立测试 → 部署/演示
4. 添加 User Story 3 → 独立测试 → 部署/演示
5. 添加 User Story 4 → 独立测试 → 部署/演示
6. 每个故事增加价值而不破坏之前的故事

### Parallel Team Strategy

多开发者协作：

1. 团队一起完成 Setup + Foundational
2. Foundational 完成后：
   - 开发者 A: User Story 1
   - 开发者 B: User Story 2
   - 开发者 C: User Story 3
3. 故事独立完成和集成

---

## Notes

- [P] 任务 = 不同文件，无依赖
- [Story] 标签将任务映射到特定用户故事以便追溯
- 每个用户故事应可独立完成和测试
- 实现前验证测试失败
- 每个任务或逻辑组后提交
- 在任何检查点停止以独立验证故事
- 避免：模糊任务、同文件冲突、破坏独立性的跨故事依赖

---

## Summary

- **总任务数**: 135
- **User Story 1 任务数**: 19（T024-T042）
- **User Story 2 任务数**: 17（T043-T059）
- **User Story 3 任务数**: 20（T060-T079）
- **User Story 4 任务数**: 19（T080-T098）
- **并行机会**: 每个阶段内标记 [P] 的任务可并行；Foundational 完成后所有用户故事可并行
- **独立测试标准**: 每个用户故事都有明确的验收场景和性能目标
- **建议 MVP 范围**: Phase 1 + Phase 2 + Phase 3（User Story 1）= 42 个任务
- **格式验证**: ✅ 所有任务遵循 checklist 格式（checkbox、ID、标签、文件路径）

---

## 附加文档任务

- [x] T133 [P] 创建 Android 运行指南 docs/ANDROID_SETUP.md
- [x] T134 [P] 创建运行状态报告 docs/RUN_STATUS.md
- [x] T135 [P] 更新 README.md 文档链接


# 云端语音卡片后台上传设计

## 状态

- 当前状态：已实现
- 用户确认日期：2026-03-22
- 实现完成日期：2026-03-22

## 评审记录

- 2026-03-22：用户提出云端模式下语音卡片不应在上传失败时删除，而应先本地创建卡片、音频保存在 `cache`，后台静默上传并自动重试。
- 2026-03-22：设计确认以下约束：
  - 停止录音后不再弹失败提示
  - 上传失败不显示“失败”，统一显示“待上传”
  - 不保留暂停能力，录音中只有“停止”
  - `待上传` 卡片允许直接播放本地 `cache` 文件
  - 删除 `待上传` 卡片时，要同时删除本地文件并取消上传任务
- 2026-03-22：用户 review spec 并回复 `ok`，批准进入 plan 阶段。

## 背景

当前云端模式下的语音录制链路仍然把“卡片是否创建成功”与“云端上传是否成功”绑定在一起。停止录音后如果上传或创建远端记录失败，用户会看到失败提示，甚至丢失卡片。这与离线优先和后台同步的产品目标不一致。

同时，语音文件已经在本地产生，用户预期是：

- 卡片应立即存在
- 音频应可立即播放
- 云端同步只是后台任务，而不该决定卡片能否保留

## 目标

- 云端模式下，点击录音后立即创建本地语音卡片
- 停止录音后将音频保存到本地 `cache`，卡片保留
- 后台自动上传媒体和同步云端记录
- 上传失败不打断用户，只回到“待上传”并在后续自动重试
- 只要本地卡片存在，就尽量保证音频可从本地 `cache` 播放
- 删除未同步卡片时，清理本地文件并取消后续上传

## 最终方案

### 1. 用户可见行为

- 点击录音：
  - 立即创建本地语音卡片
  - 卡片状态显示 `录音中`
- 点击停止：
  - 停止录音
  - 将音频文件保存到本地 `cache`
  - 卡片状态切为 `待上传`
  - 后台开始静默上传
- 上传过程中：
  - 卡片状态显示 `上传中`
- 上传成功后：
  - 卡片状态显示 `已同步`
- 上传失败后：
  - 不弹错误
  - 卡片状态回到 `待上传`
  - 等待下一次自动重试

### 2. 状态模型

语音卡片分成两组状态：

- 录音过程状态：`recordingStatus`
  - `recording`
  - `completed`
- 云端同步状态：`syncStatus`
  - `pending_upload`
  - `uploading`
  - `synced`

显示文案统一映射为：

- `recording` -> `录音中`
- `syncStatus=pending_upload` -> `待上传`
- `syncStatus=uploading` -> `上传中`
- `syncStatus=synced` -> `已同步`

不单独暴露“上传失败”状态。失败后直接回到 `待上传`。

### 3. 数据流

#### 开始录音

- 本地插入一条 voice entry
- 字段：
  - `type = 'voice'`
  - `recordingStatus = 'recording'`
  - `syncStatus = 'pending_upload'`
  - `media[0].uri = ''`

#### 停止录音

- 调 `VoiceService.stopRecording()`
- 将录音文件保存到 `cache`
- 更新本地 entry：
  - `recordingStatus = 'completed'`
  - `syncStatus = 'pending_upload'`
  - `media[0].uri = <cache 文件路径>`
  - `media[0].remoteUri` 保持为空

#### 后台上传

- Worker 扫描 `syncStatus = 'pending_upload'` 的语音卡片
- 开始处理前先更新为 `uploading`
- 依次执行：
  - 上传媒体文件
  - 创建或同步云端 entry
- 成功：
  - 回写远端媒体信息
  - 更新为 `synced`
- 失败：
  - 不删除卡片
  - 不删除本地 `cache`
  - 状态回退到 `pending_upload`

### 4. 播放规则

- 语音卡片优先播放 `media[0].uri` 的本地 `cache` 文件
- 不要求先上传成功才能播放
- `待上传`、`上传中`、`已同步` 三种状态都允许播放本地文件
- 只有本地文件缺失时，才考虑回退到 `remoteUri`

### 5. 删除规则

- 删除 `pending_upload` / `uploading` 的语音卡片时：
  - 立即删除本地卡片
  - 删除对应的本地 `cache` 文件
  - 从上传队列中移除
- 删除 `synced` 语音卡片时：
  - 按现有逻辑删除本地卡片
  - 删除本地 `cache` 文件
  - 删除云端记录

## 架构与模块边界

### 1. UI 层

涉及文件：

- `app/src/components/EntryCard.tsx`
- `app/src/components/Timeline.v2.tsx`
- `app/app/(tabs)/index.tsx`

职责：

- 展示语音卡片状态文字
- 录音中只暴露“停止”操作
- 不负责上传逻辑与重试逻辑

### 2. 本地数据层

涉及文件：

- `app/src/store/entryStore.ts`
- `app/src/database/operations.ts`
- `app/src/database/dataSource.ts`
- `app/src/types/entry.ts`

职责：

- 维护语音卡片本地状态
- 保存 `cache` 文件路径
- 维护同步状态字段
- 删除卡片时同步清理本地文件

### 3. 后台同步层

建议新增独立 worker / queue 模块。

职责：

- 扫描待上传语音卡
- 串行或受控并发上传
- 管理 `pending_upload -> uploading -> synced/pending_upload` 流转
- 响应以下触发时机：
  - App 启动
  - App 回到前台
  - 网络恢复

## 影响范围

- 云端模式下的语音录制与同步链路
- 语音卡片的状态文案与播放逻辑
- 本地 entry 字段模型与 SQLite 持久化
- app 启动/前台恢复时的同步任务触发

## 不在范围内

- 照片与文本卡片的后台重试
- 定时轮询上传
- 后台上传通知栏或系统级任务调度
- 暂停/继续录音功能
- 上传失败的显式错误提示 UI

## 验收标准

- 云端模式下点击录音，立即出现本地语音卡片并显示 `录音中`
- 停止录音后卡片不消失，音频保存到 `cache`，状态变为 `待上传`
- 无网络时停止录音，卡片仍保留且可播放
- 网络恢复或 app 重启后，待上传语音可自动继续上传
- 上传成功后状态更新为 `已同步`
- 上传失败时状态回退为 `待上传`，不弹失败提示
- 删除 `待上传` 卡片时，本地音频文件被清理，后续不再上传

## Spec Review 留痕

- 2026-03-22：已完成对话内 review，并将用户确认结果写回本文档；当前状态更新为 `已批准`。

## 实现结果

- 已按设计完成本地优先语音卡链路：
  - 开始录音即创建本地语音卡
  - 停止录音后先写入本地 `cache`
  - 卡片保留并进入 `待上传`
  - 后台串行上传并在成功后转为 `已同步`
- 已完成删除语义：
  - 删除 `pending_upload` / `uploading` 语音卡时，会取消上传任务并删除本地 `cache` 文件
- 已完成自动重试触发：
  - App 启动
  - App 回到前台
  - 网络恢复

## 实现偏差说明

- 原 plan 中 Task 2 的失败测试示例放在 `src/database/__tests__/dataSource.test.ts`，实际实现时将 SQLite 持久化断言补在 `src/database/__tests__/operations.test.ts`，因为 `sync_status` 与 `media_json.remoteUri` 的核心逻辑位于 `operations.ts`。
- 为满足“网络恢复时自动重试”，实际新增了 `expo-network` 依赖，并在 Android 端重新构建安装原生壳以接入 `ExpoNetwork` 模块。

## 最终验证结果

- 类型检查：
  - `cd app && npx tsc --noEmit`
  - 结果：通过
- 目标测试：
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/database/__tests__/operations.test.ts`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/database/__tests__/dataSource.test.ts`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceService.test.ts`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceUploadQueue.test.ts`
  - `cd app && CI=1 npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts'`
  - 结果：全部通过
- 全量测试：
  - `cd app && CI=1 npx jest --run-in-band`
  - 结果：34 个测试套件，257 个测试全部通过
- 手动验证：
  - 已完成 Android 原生包重编译并确认 `expo-network` 原生模块接入成功，应用可正常启动，不再出现 `Cannot find native module 'ExpoNetwork'`
  - 未执行会改写现有用户数据的完整录音上传手测，避免再次影响模拟器中的现有数据

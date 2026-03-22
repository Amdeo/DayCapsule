# 云端录音停止即时性修复设计

## 状态

- 当前状态：已实现
- 设计确认日期：2026-03-22
- 实现完成日期：2026-03-22

## 评审记录

- 2026-03-22：用户反馈云端模式下点击录音卡片的“停止”后，计时仍继续增长，最终保存出来的音频时长也明显超过点击时刻。
- 2026-03-22：已确认范围只收 `云端模式` 的录音停止链路，不扩展到本地模式或其它媒体类型。
- 2026-03-22：已确认成功标准为“点击停止后应立即结束录音采集，UI 立即从录音中切到处理中；后续 cache 保存和后台上传可以稍后完成”。
- 2026-03-22：用户 review spec 并回复 `ok`，批准进入 plan 阶段。

## 背景

当前云端模式下的录音停止链路把“结束录音采集”和“保存本地文件 / 写入 cache / 更新 entry / 入后台上传队列”串成了一个整体动作。用户点击停止后，页面计时仍继续增长，且最终文件时长也会继续变长，说明问题不是单纯 UI 延迟，而是实际音频采集没有在点击时刻及时结束。

这与当前语音卡片的产品语义冲突：

- 录音中只保留“停止”操作
- 用户点击“停止”后应立即结束录音
- 本地优先与后台上传不应影响“是否已经停采”

## 目标

- 云端模式下点击“停止”后立即结束音频采集
- 页面计时器在点击时刻立即冻结，不再继续累加
- 停止过程中避免重复点击和重复 stop 调用
- 保持现有“本地 cache + 后台上传”链路不变
- 不把这次 bugfix 扩大成新的语音上传架构重构

## 最终方案

### 1. 停止流程拆成两阶段

将当前“停止录音”拆成两个职责明确的阶段：

- 第一阶段：即时停采
  - 点击停止后，第一时间让 recorder 停止采集
  - UI 立即退出 `recording`
  - 页面时长冻结
- 第二阶段：收尾处理
  - 获取最终录音 URI
  - 读取文件大小与时长
  - 保存到本地 `cache`
  - 更新 entry
  - 入 `voiceUploadQueue`

`VoiceService` 对外仍可保留 `stopRecording()` 入口，但内部必须保证“先停采，再做后处理”，而不是把所有步骤当作一个不可分割的大动作。

### 2. 本地录音状态新增 `stopping`

为避免用户在等待后处理时仍看到“录音中”，本地录音状态补一个短暂状态：

- `recording`
- `stopping`
- `completed`

状态含义：

- `recording`：正在采集音频
- `stopping`：用户已点击停止，录音采集必须已经结束；此时只允许显示处理中，不允许再次 stop
- `completed`：本地音频文件已拿到并完成本地 entry 更新

`stopping` 仅用于本地 UI 和本地数据流，不进入云同步协议语义，不要求后端理解。

### 3. UI 与交互行为

点击语音卡片的停止按钮后：

- 立即停掉页面上的 recording timer
- 立即把对应 entry 从 `recording` 切到 `stopping`
- 停止按钮禁用，避免重复触发
- 卡片文案从“录音中...”切到“处理中...”

在后处理完成后：

- 更新为 `recordingStatus = completed`
- 维持现有 `syncStatus = pending_upload`
- 写入本地 `cache` 路径
- 继续走现有后台上传队列

### 4. 错误处理

#### 4.1 停采成功，但后处理失败

如果录音采集已经停止，但后续拿 URI、写 cache、更新 entry 或入队失败：

- 不能恢复成 `recording`
- 不能继续让计时增长
- 本次最小实现要求：
  - 录音采集已结束
  - 页面退出录音中态
  - 记录错误日志
  - 清理 `currentRecordingIdRef`

这次 bugfix 不顺带重设计“停止后本地保存失败”的完整恢复交互，只要求先把“已经点停止却还在继续录音”修正。

#### 4.2 recorder 不存在或状态异常

若 stop 时 recorder 已不存在或状态异常：

- 清理页面 timer
- 清理 `currentRecordingIdRef`
- 记录错误
- 不允许卡片永久停留在 `recording`

#### 4.3 防重复 stop

当 entry 已进入 `stopping` 时：

- 停止按钮禁用
- 重复点击直接忽略
- 不应再次触发 `VoiceService.stopRecording()`

## 架构与模块边界

### 1. `VoiceService`

涉及文件：

- `app/src/services/voiceService.ts`

职责：

- 提供“先停采、后收尾”的停止语义
- 负责 recorder 生命周期清理
- 不负责 entry 状态更新与上传队列

### 2. 主页录音链路

涉及文件：

- `app/app/(tabs)/index.tsx`

职责：

- 响应 stop 点击
- 立即清理计时器
- 立即把本地 entry 切到 `stopping`
- 等待 `VoiceService` 完成 stop 后续收尾
- 成功后更新本地 entry 为 `completed + pending_upload`

### 3. 卡片展示层

涉及文件：

- `app/src/components/EntryCard.tsx`

职责：

- 根据 `recordingStatus` 展示“录音中 / 处理中 / 待上传”
- 在 `stopping` 状态下禁用 stop 按钮
- 不处理底层录音控制逻辑

### 4. 后台上传层

涉及文件：

- `app/src/services/voiceUploadQueue.ts`

职责：

- 继续处理 `completed` 之后的后台上传
- 不参与“点击停止是否立即停采”的判定

## 影响范围

- 云端模式语音卡片的停止交互
- `VoiceService` 的 stop 语义
- 主页录音状态流转
- 语音卡片在录音停止瞬间的展示逻辑
- 相关单元测试与链路测试

## 不在范围内

- 本地模式录音链路改造
- 暂停/继续录音功能恢复
- 语音后台上传队列重构
- 语音 stop 失败后的完整恢复产品设计
- 照片、文本等其它类型条目

## 验收标准

- 云端模式下点击语音卡片“停止”后，页面计时立即停止，不再继续增长
- 最终保存出来的音频时长不再明显超过点击停止的时刻
- 点击停止后，卡片立即退出 `录音中...`，切到 `处理中...`
- `stopping` 状态下重复点击不会再次触发 stop
- 后处理完成后，卡片继续进入现有 `pending_upload -> uploading -> synced` 链路
- 现有语音后台上传行为不被这次 bugfix 打断

## Spec Review 留痕

- 2026-03-22：已完成本地结构化 review，重点检查范围控制、状态机边界、防重复 stop 与失败语义；当前版本可进入用户 review gate。

## 实现结果

- `VoiceService.stopRecording()` 已调整为：
  - 先用局部 `recorder` 完成 `stop()`
  - 立即清空 `this.recorder` / `this.recordingSession`
  - 再读取最终 URI 和文件大小
  - 当 recorder 已经结束采集但仍保留 `uri/url` 时，继续按可收尾状态完成本地保存，不再把 `Recorder not prepared` 当作致命错误
- 云端录音完成 helper 已改成在 `await stopRecording()` 前先写一次 `recordingStatus = stopping`
- `EntryCard` 的普通卡与 `calendar` 变体都已支持 `stopping`：
  - 显示 `处理中...`
  - 停止按钮禁用
  - 卡片点击在 `stopping` 时被忽略
- `EntryCard` 的 stop 交互额外补了同步 ref 防重，连续点击只会触发一次 stop 调用
- 首页录音时长发布已从高频原始秒数刷新，改成“按整秒显示值发布”，避免录音期间每 `100ms` 刷一次全局 store 拖慢 stop 点击响应

## 实现偏差说明

- 计划中提到可以提取新的 `stopCloudVoiceRecordingForTest()` helper，实际实现时没有新增命名 helper，而是在现有 `finalizeCloudVoiceRecordingForTest()` 中直接收敛“先切 `stopping`，再 stop”的顺序。这样能减少 API 面变化，保持调用点更小。
- 为解决真实复现中“第一次 stop 点击迟迟不触发”的问题，实际实现额外增加了两项收敛：
  - 录音时长只在整秒变化时才发布到 `entryStore`
  - stop 按钮增加同步 ref 防重，防止排队点击穿透到重复 stop

## 最终验证结果

- 目标测试：
  - `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceService.test.ts 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' src/components/__tests__/EntryCard.test.tsx`
  - 结果：通过，`3` 个 suite，`49` 个测试全部通过
- 类型检查：
  - `cd app && npx tsc --noEmit`
  - 结果：通过
- diff 检查：
  - `git diff --check -- app/src/services/voiceService.ts app/src/services/__tests__/voiceService.test.ts app/src/types/entry.ts app/app/'(tabs)'/index.tsx app/app/'(tabs)'/__tests__/index.voice-cloud-mode.test.ts app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx docs/superpowers/specs/2026-03-22-voice-stop-immediacy-design.md docs/superpowers/plans/2026-03-22-voice-stop-immediacy.md`
  - 结果：通过
- 手动验证：
  - 已尝试通过 Android 模拟器进行最小点击验证，并确认应用可进入录音态
  - 但自动化点按未能稳定命中录音卡 stop 按钮，因此没有把这轮模拟器手测计为“通过”
  - 仍需用户在真实交互下复测“点击停止后时长立即冻结”

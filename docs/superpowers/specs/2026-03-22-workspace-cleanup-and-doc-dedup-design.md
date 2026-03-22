# 剩余工作区收口与旧文档去冲突设计

## 状态

- 当前状态：已实现
- 用户确认日期：2026-03-22
- 实现完成日期：2026-03-22

## 评审记录

- 2026-03-22：已识别出当前工作区剩余改动混合了三类来源：
  - 已提交任务遗留的兼容修复
  - 下一条照片/媒体任务的草稿
  - 与已拆分子任务冲突的旧 `cloud-mode-frontend-integration` 文档补丁
- 2026-03-22：用户确认本轮优先做“收口盘点”，先处理兼容修复与旧文档去冲突，不继续推进照片功能实现。
- 2026-03-22：已完成本轮自查，确认以下边界：
  - `usePermissions.ts` 必须纳入，因为当前依赖已切到 `expo-audio`
  - `photoService.ts` 与 `index.photo.test.ts` 应继续留在下一条照片/媒体任务
  - `2026-03-22-cloud-sync-offline-first.md` 仅作为待后续处理的总控草稿，不在本轮纳入
- 2026-03-22：spec 已写入并单独提交，用户 review 后回复 `ok`，批准进入 plan 阶段。

## 背景

`frontend-local-first-sync-core` 与 `voice-cloud-background-upload` 已分别通过独立 spec / plan / 实现 / 验证并提交到主分支：

- `d6a8eb1 feat: add frontend local-first sync core`
- `97e9ebd feat: add cloud voice background upload flow`

但工作区仍残留若干未提交改动，来源不一致：

- 一部分是为了适配上述两条已提交任务而遗漏的兼容层修复
- 一部分是尚未启动新流程的照片 / 媒体同步草稿
- 一部分是旧总任务文档被事后追加内容，已经与新的 2026-03-22 子任务文档发生语义冲突

如果继续在当前状态上叠实现，会进一步模糊任务边界，导致“代码已提交但剩余工作区和文档仍不一致”的状态扩大。

## 目标

- 收口已提交任务遗漏的兼容修复，避免运行层和类型层继续分叉
- 明确哪些剩余改动属于下一条照片 / 媒体任务，不在本轮混入
- 把旧 `2026-03-21-cloud-mode-frontend-integration` 文档降级为历史背景文档，不再与 2026-03-22 子任务文档竞争“当前真相”
- 保持未知来源的本地噪音不进入本轮功能提交

## 最终方案

### 1. 兼容修复只收四个前端文件

本轮只处理以下四个文件的兼容层改动：

- `app/src/hooks/usePermissions.ts`
- `app/src/components/Timeline.v2.tsx`
- `app/src/components/CalendarView.tsx`
- `app/src/components/CalendarTimelineItem.tsx`

处理原则：

- `usePermissions.ts` 跟随当前已提交的 `expo-audio` 录音链路，移除遗留的旧权限调用方式
- `Timeline` / `Calendar` 相关组件移除已不再使用的 `pause/resume recording` 透传 props，和当前“录音中只保留停止操作”的已提交行为对齐

这些改动被视为前两条已提交任务的兼容收尾，而不是新功能实现。

### 2. 照片 / 媒体草稿不在本轮推进

以下文件明确归入下一条照片 / 媒体同步任务，不在本轮继续实现或提交：

- `app/src/services/photoService.ts`
- `app/app/(tabs)/__tests__/index.photo.test.ts`

它们代表的是“照片先落 cache、失败回滚本地文件”的下一步能力，应在新的 `brainstorming -> spec -> plan -> 实现 -> 验证` 链路下单独推进。

本轮只允许在盘点说明中提及它们的归属，不修改其实现方向。

### 3. 旧 `2026-03-21` 文档降级为历史文档

本轮更新以下旧文档：

- `docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md`
- `docs/superpowers/plans/2026-03-21-cloud-mode-frontend-integration.md`

更新原则：

- 明确标注：该文档已被 2026-03-22 的更小子任务拆分替代
- 删除或改写与当前已提交子任务冲突的补充规则，尤其是：
  - “语音上传失败则不建卡并删除本地数据”
  - 任何继续把该旧文档描述为当前实现真相的文字
- 保留其作为历史背景和最初大方案的记录价值，但不再作为当前实现判断依据
- 在文档中显式指向当前 authoritative 文档：
  - `2026-03-22-frontend-local-first-sync-core-*`
  - `2026-03-22-voice-cloud-background-upload-*`
  - 已落地的后端增量同步子任务文档

### 4. 噪音文件不并入本轮

以下内容不进入本轮收口实现，也不并入本轮提交：

- `.debug/`
- `.gitignore`
- `app/metro.config.js`
- `docs/superpowers/plans/2026-03-22-cloud-sync-offline-first.md`

原因：

- 来源不稳定，或当前无法证明与本轮目标直接相关
- 一旦并入，容易把“兼容修复收尾”再次扩成新的混合任务

其中 `2026-03-22-cloud-sync-offline-first.md` 若未来保留，应改为总控/索引文档，而不是继续承载细节设计；但这不在本轮实现范围内。

## 影响范围

- 前端录音权限与录音操作相关的兼容层
- 时间线 / 日历视图的语音操作 props 边界
- 旧 `cloud-mode-frontend-integration` 文档的状态定位与交叉引用

## 不在范围内

- 照片 cache / 上传 / 删除回滚的实现推进
- 新的媒体同步 spec / plan
- `.debug` 中的本地调试资产处理
- `metro.config.js` 的 wasm / COEP 配置
- `.gitignore` 的上传目录忽略规则
- `2026-03-22-cloud-sync-offline-first.md` 的内容定稿

## 验收标准

- `usePermissions.ts` 与当前 `expo-audio` 录音链路一致，不再保留旧权限调用残留
- `Timeline.v2.tsx`、`CalendarView.tsx`、`CalendarTimelineItem.tsx` 不再对外暴露已废弃的 `pause/resume recording` props
- 旧 `2026-03-21-cloud-mode-frontend-integration` spec / plan 明确标注为历史/已拆分，不再描述与 2026-03-22 子任务冲突的当前行为
- 本轮提交不包含照片功能草稿、`.debug`、`.gitignore`、`metro.config.js`
- 收口完成后，工作区中剩余未提交改动应更清晰地归属于“下一条照片 / 媒体任务”或“本地噪音”

## 实现结果

- 已新增 `app/src/hooks/__tests__/usePermissions.test.ts`，把录音权限检查的当前语义固定为：
  - 已授权时不重复请求
  - 未授权时才请求
  - 权限查询异常时返回 `false`
- 已确认并收口当前工作区中预先存在的兼容修复：
  - `app/src/hooks/usePermissions.ts` 已对齐 `expo-audio`
  - `Timeline.v2.tsx`、`CalendarView.tsx`、`CalendarTimelineItem.tsx` 已不再透传废弃的 `pause/resume recording` props
- 已把 `2026-03-21-cloud-mode-frontend-integration` 的旧 spec / plan 改写为历史归档文档，显式指向 2026-03-22 的 authoritative 子任务文档

## 最终说明

- 本轮的重点是“收口与去冲突”，不是新增功能
- 兼容层中的一部分生产代码改动在本轮开始前已经存在于工作区，因此这次执行主要完成了：
  - 新增测试锚点
  - 明确兼容修复归属
  - 清理旧文档与当前子任务文档之间的冲突
- 照片 / 媒体草稿、`.debug`、`.gitignore`、`app/metro.config.js`、`2026-03-22-cloud-sync-offline-first.md` 继续留在本轮范围外

## 验证结果

- 目标测试：
  - `cd app && npx jest --run-in-band --runTestsByPath src/hooks/__tests__/usePermissions.test.ts src/components/__tests__/CalendarView.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx`
  - 结果：3 个测试文件，16 个测试全部通过
- 类型检查：
  - `cd app && npx tsc --noEmit`
  - 结果：通过
- scoped diff 检查：
  - `git diff --check -- app/src/hooks/usePermissions.ts app/src/hooks/__tests__/usePermissions.test.ts app/src/components/Timeline.v2.tsx app/src/components/CalendarView.tsx app/src/components/CalendarTimelineItem.tsx app/src/components/__tests__/Timeline.v2.view-mode.test.tsx app/src/components/__tests__/CalendarView.test.tsx docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md docs/superpowers/plans/2026-03-21-cloud-mode-frontend-integration.md docs/superpowers/specs/2026-03-22-workspace-cleanup-and-doc-dedup-design.md docs/superpowers/plans/2026-03-22-workspace-cleanup-and-doc-dedup.md`
  - 结果：通过

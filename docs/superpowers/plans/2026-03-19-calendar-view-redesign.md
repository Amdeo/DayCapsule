# Calendar View Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将「按月」和「日历」合并为增强日历视图，并把日历内容区重做为一套保留完整交互能力的时间轴卡片系统。

**Architecture:** 保留 `CalendarView` 的月历格子、选中日期和月份切换逻辑，但把内容区从“简化文本行”重构为独立的日历时间轴卡片系统。卡片系统按 `text / photo / voice` 分化主内容区，完整复用现有记录能力，并新增“日历内容区密度”设置影响布局密度而不影响行为。

**Tech Stack:** React Native, TypeScript, Zustand, MMKV Storage, Jest + @testing-library/react-native

---

## 执行状态

- 状态：已实现，已验证
- 实现时间：2026-03-19
- 验证结果：
  - `cd app && npx tsc --noEmit` 通过
  - `cd app && npx jest --testPathPattern="EntryCard.test|CalendarView.test|Timeline.v2.view-mode|SettingsPage" --no-coverage` 通过
  - `cd app && npx jest --no-coverage` 通过

## 实现说明

- 日历内容区已从简化文本行切换为时间轴卡片列表。
- `EntryCard` 新增 `calendar` 变体，用于承载日历场景的完整能力与新的照片布局。
- 照片卡已落地：
  - 单图：干净大单图
  - 多图：主图 + 侧露结构型
- 设置页已新增 `日历内容区密度`，并接入 `settingsStore`。

---

## 文件变更一览

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/components/CalendarView.tsx` | 修改 | 接入新时间轴卡片系统、密度设置、完整回调 |
| `app/src/components/Timeline.v2.tsx` | 修改 | 删除 `monthly` 模式，向 `CalendarView` 传递完整回调与状态 |
| `app/src/components/EntryCard.tsx` | 修改 | 抽出可复用内容主体或新增变体支持，避免重复实现完整能力 |
| `app/src/components/CalendarTimelineItem.tsx` | 新建 | 日历内容区单条时间轴项：时间、圆点、卡片容器 |
| `app/src/components/CalendarEntryCard.tsx` | 新建 | 日历场景专用卡片外壳与类型分发 |
| `app/src/components/CalendarTextCardBody.tsx` | 新建 | 文字卡主体 |
| `app/src/components/CalendarPhotoCardBody.tsx` | 新建 | 照片卡主体，落地单图/多图方案 |
| `app/src/components/CalendarVoiceCardBody.tsx` | 新建 | 语音卡主体 |
| `app/src/store/settingsStore.ts` | 修改 | 新增 `calendarDensity` 设置值、默认值、load/reset/setter |
| `app/src/components/SettingsPage.tsx` | 修改 | 新增“日历内容区密度”设置组件 |
| `app/src/components/__tests__/CalendarView.test.tsx` | 重写/扩展 | 覆盖完整能力、空 content 媒体场景、密度切换 |
| `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx` | 修改 | 适配新 `CalendarView` props 与 view mode 行为 |
| `app/src/components/__tests__/SettingsPage.test.tsx` | 新建或修改 | 覆盖密度设置读写与默认值 |

---

## Chunk 1: 测试红线与接口基线

### Task 1: 重建 CalendarView 的行为测试基线

**Files:**
- Modify: `app/src/components/__tests__/CalendarView.test.tsx`

- [ ] **Step 1: 重写测试数据，覆盖真实媒体场景**

补充以下数据形态：

- `text`：有 `content`、有 tags
- `photo`：`content` 可为空，`media` 至少 1 张
- `photo`：多张 `media`
- `voice`：`content` 为空，依赖 `media.duration + transcription`
- `voice`：`recordingStatus === 'recording'`

- [ ] **Step 2: 写失败测试，验证日历默认展示完整内容而非简化行**

至少新增这些断言：

- 照片记录出现图片区 / 数量提示，而不是只看 `content`
- 语音记录出现播放区 / 时长 / 转录，而不是只看 `content`
- 标签、转录、录音中状态可见

- [ ] **Step 3: 写失败测试，覆盖单图 / 多图方案**

至少断言：

- 单图照片卡走“大单图”布局
- 多图照片卡走“主图 + 侧露结构”布局

- [ ] **Step 4: 写失败测试，覆盖点击过滤、取消、切月清空选中**

沿用现有行为测试，但数据换成完整媒体记录。

- [ ] **Step 5: 运行测试确认失败**

Run:

```bash
cd app && npx jest --testPathPattern="CalendarView.test" --no-coverage
```

Expected:

- 多个 FAIL
- 失败原因集中在“缺少完整卡片内容 / 布局 / 交互”

- [ ] **Step 6: Commit**

```bash
git add app/src/components/__tests__/CalendarView.test.tsx
git commit -m "test: rebuild CalendarView coverage for full card behavior"
```

### Task 2: 为设置项和 Timeline 交互补失败测试

**Files:**
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Create or Modify: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: 为 `Timeline.v2` 写失败测试**

断言：

- 切到日历模式时，`CalendarView` 接收到完整回调和状态，不只是 `entries`
- 旧的 `monthly` 模式不再存在

- [ ] **Step 2: 为设置页写失败测试**

断言：

- 新增“日历内容区密度”设置项
- 默认值为 `标准`
- 切换后调用 store setter

- [ ] **Step 3: 运行目标测试确认失败**

Run:

```bash
cd app && npx jest --testPathPattern="Timeline.v2.view-mode|SettingsPage" --no-coverage
```

Expected:

- FAIL，提示 props / 设置项 / 文案缺失

- [ ] **Step 4: Commit**

```bash
git add app/src/components/__tests__/Timeline.v2.view-mode.test.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "test: add failing coverage for calendar density and full calendar props"
```

---

## Chunk 2: 设置层与密度配置

### Task 3: 在 settingsStore 中新增日历内容区密度

**Files:**
- Modify: `app/src/store/settingsStore.ts`

- [ ] **Step 1: 增加类型与映射**

新增：

```ts
export type CalendarDensity = 'comfortable' | 'default' | 'compact';
export const CALENDAR_DENSITY_VALUES = {
  comfortable: { ... },
  default: { ... },
  compact: { ... },
};
```

映射项至少包含：

- 时间轴项垂直间距
- 图片区高度上限
- 文字默认截断行数
- 语音播放区高度

- [ ] **Step 2: 扩展 store state 和 setter**

新增：

- `calendarDensity`
- `setCalendarDensity`

- [ ] **Step 3: 扩展 load/reset/default/key**

同步修改：

- `SETTINGS_KEYS`
- `DEFAULT_SETTINGS`
- `loadSettings`
- `resetSettings`

- [ ] **Step 4: 运行 store 相关测试或 TypeScript**

Run:

```bash
cd app && npx tsc --noEmit
```

Expected:

- 零错误

- [ ] **Step 5: Commit**

```bash
git add app/src/store/settingsStore.ts
git commit -m "feat: add calendar density setting state"
```

### Task 4: 在 SettingsPage 中接入密度设置

**Files:**
- Modify: `app/src/components/SettingsPage.tsx`

- [ ] **Step 1: 读取 `calendarDensity` 和 setter**

从 `useSettingsStore` 接入：

- `calendarDensity`
- `setCalendarDensity`

- [ ] **Step 2: 新增 `CalendarDensitySelector` 组件**

文案：

- 标题：`日历内容区密度`
- 副标题：`调整日历视图中卡片和时间轴的疏密程度`

选项：

- `舒展`
- `标准`
- `紧凑`

- [ ] **Step 3: 将新选择器插入设置页合适位置**

建议放在：

- `CardSpacingSelector` 后
- `PhotoHeightSelector` 前

- [ ] **Step 4: 运行设置页测试**

Run:

```bash
cd app && npx jest --testPathPattern="SettingsPage" --no-coverage
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/SettingsPage.tsx
git commit -m "feat: add calendar density selector to settings"
```

---

## Chunk 3: 日历卡片系统骨架

### Task 5: 抽出日历时间轴项容器

**Files:**
- Create: `app/src/components/CalendarTimelineItem.tsx`

- [ ] **Step 1: 创建组件，定义清晰 props**

至少包含：

- `entry`
- `density`
- `children`
- `isLast`

组件职责：

- 渲染时间文本
- 渲染类型圆点
- 渲染左侧竖线
- 放置右侧卡片容器

- [ ] **Step 2: 将布局常量做成密度驱动**

不要写死单一尺寸。

- [ ] **Step 3: 写最小快照/渲染测试或先在 CalendarView 测试中驱动使用**

- [ ] **Step 4: Commit**

```bash
git add app/src/components/CalendarTimelineItem.tsx
git commit -m "feat: add calendar timeline item shell"
```

### Task 6: 建立 CalendarEntryCard 和类型化主体

**Files:**
- Create: `app/src/components/CalendarEntryCard.tsx`
- Create: `app/src/components/CalendarTextCardBody.tsx`
- Create: `app/src/components/CalendarPhotoCardBody.tsx`
- Create: `app/src/components/CalendarVoiceCardBody.tsx`
- Modify: `app/src/components/EntryCard.tsx`

- [ ] **Step 1: 决定复用边界**

实现原则：

- 不复制 `EntryCard` 的完整业务逻辑
- 优先抽可复用的内容主体或共享逻辑
- 避免把日历卡片写成第二套完全平行实现

- [ ] **Step 2: 让 CalendarEntryCard 支持完整交互 props**

至少支持：

- `onEdit`
- `onDelete`
- `onPauseRecording`
- `onResumeRecording`
- `onStopRecording`
- `isActionSheetActive`
- `onActionSheetOpen`

- [ ] **Step 3: 实现文字卡主体**

要求：

- 正文优先
- tags 保留
- 长内容可展开

- [ ] **Step 4: 实现照片卡主体**

要求：

- 单图：干净大单图
- 多图：主图 + 侧露结构型
- 适配手机竖图
- 统一高度上限，受密度影响

- [ ] **Step 5: 实现语音卡主体**

要求：

- 播放按钮 / 波形 / 时长优先
- 转录摘要保留
- 录音中状态保留

- [ ] **Step 6: 在这一层补齐空 `content` 媒体记录处理**

不要再使用“只看 `entry.content`”的渲染策略。

- [ ] **Step 7: 跑目标测试**

Run:

```bash
cd app && npx jest --testPathPattern="CalendarView.test" --no-coverage
```

Expected:

- 大部分或全部 PASS

- [ ] **Step 8: Commit**

```bash
git add app/src/components/CalendarEntryCard.tsx app/src/components/CalendarTextCardBody.tsx app/src/components/CalendarPhotoCardBody.tsx app/src/components/CalendarVoiceCardBody.tsx app/src/components/EntryCard.tsx
git commit -m "feat: build full calendar card system"
```

---

## Chunk 4: CalendarView 与 Timeline 集成

### Task 7: 重构 CalendarView 内容区

**Files:**
- Modify: `app/src/components/CalendarView.tsx`

- [ ] **Step 1: 删除简化 `entryRow` 渲染逻辑**

移除当前依赖：

- `entryRow`
- `entryTypeDot`
- 纯 `entry.content` 文本行

- [ ] **Step 2: 接入密度设置**

从 `useSettingsStore` 读取 `calendarDensity`，把值传给：

- `CalendarTimelineItem`
- `CalendarEntryCard`

- [ ] **Step 3: 让全月模式和单日模式都走新卡片系统**

要求：

- 全月模式：按天分组后渲染 timeline items
- 单日模式：同样渲染 timeline items，只是数据源变成选中日期

- [ ] **Step 4: 保留现有顶部交互**

必须继续工作：

- 选中日期
- 取消选中
- 切月清空日期
- 其他日期圆点变淡

- [ ] **Step 5: 运行 CalendarView 测试**

Run:

```bash
cd app && npx jest --testPathPattern="CalendarView.test" --no-coverage
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/components/CalendarView.tsx
git commit -m "feat: integrate full timeline cards into CalendarView"
```

### Task 8: 让 Timeline.v2 向 CalendarView 传递完整能力

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`

- [ ] **Step 1: 删除旧的 `monthly` 残留逻辑（如果还有）**

- [ ] **Step 2: 向 `CalendarView` 传递完整 props**

至少传入：

- `entries`
- `onDeleteEntry`
- `onEditEntry`
- `onPauseRecording`
- `onResumeRecording`
- `onStopRecording`
- `activeActionSheetId`
- `onActionSheetOpen`

- [ ] **Step 3: 保持日历 / 列表切换动画和 loader 行为不回退**

- [ ] **Step 4: 运行 Timeline 目标测试**

Run:

```bash
cd app && npx jest --testPathPattern="Timeline.v2.view-mode" --no-coverage
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/Timeline.v2.tsx app/src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "feat: pass full record interactions into CalendarView"
```

---

## Chunk 5: 回归验证与文档收口

### Task 9: 完整验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-19-calendar-view-redesign.md`
- Modify: `docs/superpowers/plans/2026-03-19-calendar-view-redesign.md`

- [ ] **Step 1: 跑 TypeScript**

Run:

```bash
cd app && npx tsc --noEmit
```

Expected:

- 零错误

- [ ] **Step 2: 跑目标测试**

Run:

```bash
cd app && npx jest --testPathPattern="CalendarView.test|Timeline.v2.view-mode|SettingsPage" --no-coverage
```

Expected:

- 全部 PASS

- [ ] **Step 3: 跑全量测试**

Run:

```bash
cd app && npx jest --no-coverage
```

Expected:

- 全部 PASS

- [ ] **Step 4: 手动验收**

至少手动确认：

- Tab 只有列表 / 日历
- 点击日期过滤与取消正常
- 切月清空选中正常
- 文字卡可编辑
- 照片卡可预览
- 单图 / 多图布局符合 spec
- 语音卡可播放 / 停止
- 录音中状态可见
- 左滑动作和长按展开可用
- 设置中密度切换即时生效

- [ ] **Step 5: 更新 spec / plan 状态**

更新：

- spec 状态改为 `已实现`
- plan 勾选关键验收项并补验证记录

- [ ] **Step 6: 最终 Commit**

```bash
git add docs/superpowers/specs/2026-03-19-calendar-view-redesign.md docs/superpowers/plans/2026-03-19-calendar-view-redesign.md
git commit -m "docs: finalize calendar view redesign verification"
```

---

## 验收清单

- [x] 日历内容区不再出现简化文本行
- [x] 三类记录在日历里都具备完整功能
- [x] `photo` / `voice` 在 `content` 为空时仍可正确展示
- [x] 多图照片卡使用“主图 + 侧露结构型”
- [x] 单图照片卡使用“干净大单图”
- [x] 左侧时间轴、时间标签、类型圆点保留
- [x] 设置页新增“日历内容区密度”
- [x] `舒展 / 标准 / 紧凑` 三档可切换
- [x] 默认密度为 `标准`
- [x] 切换密度只改变布局，不影响交互能力
- [x] `npx tsc --noEmit` 零错误
- [x] `npx jest --no-coverage` 全部通过

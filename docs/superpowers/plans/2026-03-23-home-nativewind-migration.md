# 首页 NativeWind 迁移与样式守卫 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重做首页视觉和交互的前提下，把首页第一批核心组件迁到 `NativeWind`，并引入 `ESLint` 样式守卫，阻止新增 `StyleSheet.create` 和可静态化的大块内联样式。

**Architecture:** 先在 `app/` 工作区补齐 `ESLint + 自定义样式规则 + legacy allowlist`，把“新增严格禁止、存量显式放行”的机制立起来；然后按 `tailwind token -> 首页壳层 -> EntryCard -> FAB/Sidebar` 的顺序渐进迁移第一批文件。迁移只改变样式表达方式，不主动调整首页视觉结果；动态动画、运行时尺寸和第三方受限场景继续保留 `style`。

**Tech Stack:** React Native, Expo Router, NativeWind 4, Tailwind CSS, ESLint, Jest, Testing Library, React Native Reanimated

**Spec:** `docs/superpowers/specs/2026-03-23-home-nativewind-migration-design.md`

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建实现计划，范围覆盖首页第一批 `NativeWind` 迁移、Tailwind token 收敛和 `ESLint` 自动守卫。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/eslint.config.js` | `app/` 工作区 ESLint flat config，串联 TypeScript、React、hooks 和本地样式守卫规则 |
| `app/eslint/style-guard-allowlist.js` | 记录暂时允许保留 `StyleSheet.create` / 静态内联 `style` 的 legacy 文件白名单 |
| `app/eslint-rules/index.js` | 暴露本地 `style-guard` 插件规则 |
| `app/eslint-rules/no-new-stylesheet-create.js` | 拦截 `StyleSheet.create()`，对白名单外文件报错 |
| `app/eslint-rules/no-static-inline-styles.js` | 拦截可静态化的大块 JSX `style` 对象，保留动态样式例外 |
| `app/eslint-rules/__fixtures__/allowed-dynamic-style.tsx` | 守卫规则允许样例：动画值、运行时尺寸、第三方 `style` 例外 |
| `app/eslint-rules/__fixtures__/disallowed-static-inline-style.tsx` | 守卫规则禁止样例：静态内联对象样式 |
| `app/eslint-rules/__fixtures__/disallowed-stylesheet-create.tsx` | 守卫规则禁止样例：新增 `StyleSheet.create` |
| `app/eslint-rules/__tests__/style-guardrails.test.ts` | 通过 ESLint API 直接回归本地规则与 allowlist 行为 |
| `app/src/components/TimelineSectionHeader.tsx` | Timeline 日期分组头的纯展示组件，专注时间轴线、圆点和标题文本 |
| `app/src/components/TimelineEmptyState.tsx` | Timeline 空态展示组件，专注空列表图标、说明文案和容器样式 |
| `app/src/components/__tests__/TimelineSectionHeader.test.tsx` | 锁定 Timeline 分组头的基础样式与文本显示 |
| `app/src/components/__tests__/TimelineEmptyState.test.tsx` | 锁定 Timeline 空态布局和文案回归 |
| `app/src/components/entryCardVariants.ts` | 统一管理 text/photo/voice 三类卡片的样式变体映射，避免颜色和壳层类名散落在 `EntryCard.tsx` |
| `app/src/components/__tests__/entryCardVariants.test.ts` | 锁定卡片变体映射输出，确保类型色和壳层类名稳定 |
| `app/src/components/__tests__/Sidebar.test.tsx` | 锁定 Sidebar 头部、菜单项和底部安全区 padding 的展示回归 |

### Modified Files

| File | Change |
|------|--------|
| `app/package.json` | 增加 `lint` 脚本和 ESLint 相关 devDependencies |
| `app/tailwind.config.js` | 补齐首页第一批迁移所需语义 token，收敛现有颜色、圆角、阴影和间距 |
| `app/src/components/SearchBar.tsx` | 把静态壳层样式改为 `className`，保留安全区 paddingTop 和菜单按钮缩放动画的动态 `style` |
| `app/src/components/__tests__/SearchBar.safe-area.test.tsx` | 锁定 safe area padding、按钮尺寸和右侧动作区回归 |
| `app/src/components/Timeline.v2.tsx` | 改为组合 `TimelineSectionHeader` / `TimelineEmptyState`，把静态壳层样式迁到 `NativeWind` |
| `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx` | 锁定首页列表/日历切换、loader 色值和空态渲染回归 |
| `app/app/(tabs)/index.tsx` | 仅保留页面逻辑和动画位移，移除静态容器样式到 `className` |
| `app/app/(tabs)/__tests__/index.photo.test.ts` | 锁定首页根容器和照片路径回归 |
| `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` | 锁定首页根容器和云端录音路径回归 |
| `app/src/components/EntryCard.tsx` | 把静态卡片壳层和各类型外观迁到 `NativeWind`，保留音频、手势、动画等动态样式 |
| `app/src/components/__tests__/EntryCard.test.tsx` | 锁定语音上传、冲突副本、详情打开等交互在迁移后不回归 |
| `app/src/components/__tests__/EntryCard.border-radius.test.tsx` | 锁定卡片壳层圆角和容器结构不变 |
| `app/src/components/__tests__/EntryCard.missing-media.test.tsx` | 锁定照片卡片背景与图片丢失行为不回归 |
| `app/src/components/FABMenu.tsx` | 把静态 FAB 壳层、标签气泡和选项壳层迁到 `NativeWind`，保留手势和位置动画 |
| `app/src/components/__tests__/FABMenu.peek-hide.test.tsx` | 锁定主 FAB 尺寸、peek-hide 和 reveal 交互回归 |
| `app/src/components/Sidebar.tsx` | 把静态菜单壳层、菜单项和 footer 样式迁到 `NativeWind`，保留抽屉位移动画与安全区 padding |
| `app/eslint/style-guard-allowlist.js` | 在每个迁移 chunk 完成后移除已迁移文件，逐步收紧守卫 |
| `docs/superpowers/specs/2026-03-23-home-nativewind-migration-design.md` | 实现完成后回填状态、偏差说明、已完成验证与已知基线失败 |
| `docs/superpowers/plans/2026-03-23-home-nativewind-migration.md` | 执行过程中勾选任务、补齐验证结果和文档收口 |

## 执行约束

- 首页视觉、信息层级和交互保持现状，不借迁移之名重新设计页面。
- `NativeWind` 只负责静态视觉表达；`Reanimated`、运行时尺寸、`SafeAreaInsets`、手势位移和第三方受限 `style` 均允许保留。
- `PhotoGrid.tsx`、`ImageViewer.tsx`、`SettingsPage.tsx` 等非首批目标文件保持不动，除非实现某个测试或 lint 修复时必须做最小兼容改动。
- 每完成一个迁移 chunk，就同步从 allowlist 中删掉对应文件，避免“迁完又回退”。
- 现有基线失败 `app/src/__tests__/runtime-regressions.test.ts` 需要单独记录，最终全量测试验收时只能允许这一条既有失败存在。

## Chunk 1: 建立样式守卫与 lint 基线

### Task 1: 补齐 `ESLint` 基建、legacy allowlist 和本地样式守卫规则

**Files:**
- Modify: `app/package.json`
- Create: `app/eslint.config.js`
- Create: `app/eslint/style-guard-allowlist.js`
- Create: `app/eslint-rules/index.js`
- Create: `app/eslint-rules/no-new-stylesheet-create.js`
- Create: `app/eslint-rules/no-static-inline-styles.js`
- Create: `app/eslint-rules/__fixtures__/allowed-dynamic-style.tsx`
- Create: `app/eslint-rules/__fixtures__/disallowed-static-inline-style.tsx`
- Create: `app/eslint-rules/__fixtures__/disallowed-stylesheet-create.tsx`
- Create: `app/eslint-rules/__tests__/style-guardrails.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 style guard 的允许/禁止样例**

在 `app/eslint-rules/__tests__/style-guardrails.test.ts` 新建测试，用 `ESLint` API 直接跑本地 fixtures，至少覆盖：

```ts
it('flags new StyleSheet.create usage outside the allowlist', async () => {
  const results = await lintFixture('eslint-rules/__fixtures__/disallowed-stylesheet-create.tsx');
  expect(results[0].messages.some((m) => m.ruleId === 'style-guard/no-new-stylesheet-create')).toBe(true);
});

it('flags static inline style objects that can be className', async () => {
  const results = await lintFixture('eslint-rules/__fixtures__/disallowed-static-inline-style.tsx');
  expect(results[0].messages.some((m) => m.ruleId === 'style-guard/no-static-inline-styles')).toBe(true);
});

it('allows animated and runtime-driven style usage', async () => {
  const results = await lintFixture('eslint-rules/__fixtures__/allowed-dynamic-style.tsx');
  expect(results[0].messages).toEqual([]);
});
```

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath eslint-rules/__tests__/style-guardrails.test.ts`

Expected: FAIL，原因应是 `eslint` / `eslint.config.js` / 本地 rules 尚不存在，或者 test 中引用的规则 ID 未定义。

- [ ] **Step 3: 最小实现 lint 基建和本地守卫**

在 `app/package.json`：

- 增加 devDependencies：

```json
{
  "eslint": "^9.x",
  "@eslint/js": "^9.x",
  "typescript-eslint": "^8.x",
  "eslint-plugin-react": "^7.x",
  "eslint-plugin-react-hooks": "^5.x",
  "globals": "^15.x"
}
```

- 增加脚本：

```json
{
  "lint": "eslint . --ext .js,.ts,.tsx --max-warnings=0"
}
```

在 `app/eslint.config.js`：

- 只对 `app/**/*.{ts,tsx}`、`src/**/*.{ts,tsx}` 开启规则
- 挂载本地 `style-guard` 插件
- 启用：
  - `style-guard/no-new-stylesheet-create`
  - `style-guard/no-static-inline-styles`

在 `app/eslint/style-guard-allowlist.js`：

- 用数组显式记录现阶段还允许保留旧写法的 legacy 文件
- 初始列表要覆盖当前 `rg "StyleSheet.create|style={{"` 扫出的存量文件
- 不把本轮首批目标文件永久放行，只允许在对应 chunk 完成前短暂存在

在 `app/eslint-rules/no-new-stylesheet-create.js`：

- 识别 `StyleSheet.create(...)`
- 若当前文件不在 allowlist，直接报错

在 `app/eslint-rules/no-static-inline-styles.js`：

- 识别 JSX `style={...}` 中的静态 ObjectExpression / 静态数组组合
- 放行：
  - `animatedStyle`
  - 运行时尺寸变量
  - `StyleSheet.absoluteFill`
  - 依赖 `insets` / 动画值 / 手势值的对象

- [ ] **Step 4: 重新运行守卫测试并建立 lint 基线**

Run: `cd app && npx jest --run-in-band --runTestsByPath eslint-rules/__tests__/style-guardrails.test.ts`
Expected: PASS

Run: `cd app && npm run lint`
Expected: PASS，说明 allowlist 足以兜住当前 legacy 文件，而新规则已可用。

- [ ] **Step 5: Commit**

```bash
git add app/package.json app/eslint.config.js app/eslint/style-guard-allowlist.js app/eslint-rules
git commit -m "chore: add nativewind style guardrails"
```

## Chunk 2: 迁移首页壳层与 Timeline 展示组件

### Task 2: 补首页 token，并把 `SearchBar`、`Timeline.v2` 和 `HomeScreen` 壳层迁到 `NativeWind`

**Files:**
- Modify: `app/tailwind.config.js`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/SearchBar.tsx`
- Modify: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`
- Create: `app/src/components/TimelineSectionHeader.tsx`
- Create: `app/src/components/TimelineEmptyState.tsx`
- Create: `app/src/components/__tests__/TimelineSectionHeader.test.tsx`
- Create: `app/src/components/__tests__/TimelineEmptyState.test.tsx`
- Modify: `app/src/components/Timeline.v2.tsx`
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/app/(tabs)/__tests__/index.photo.test.ts`
- Modify: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`

- [ ] **Step 1: 先写失败测试，锁定首页壳层和 Timeline 展示片段**

在 `app/src/components/__tests__/SearchBar.safe-area.test.tsx` 增加：

```ts
it('keeps the menu button and search shell dimensions after nativewind migration', () => {
  const { getByTestId } = render(<SearchBar />);
  expect(getByTestId('searchbar-menu-button')).toHaveStyle({ width: 48, height: 48, borderRadius: 24 });
  expect(getByTestId('searchbar-search-box')).toHaveStyle({ height: 48 });
});
```

在 `app/src/components/__tests__/TimelineSectionHeader.test.tsx` 新建：

```ts
it('renders the section title with the existing timeline shell', () => {
  const { getByTestId, getByText } = render(<TimelineSectionHeader title="今天" timestamp={Date.now()} />);
  expect(getByTestId('timeline-section-header')).toHaveStyle({ height: 48 });
  expect(getByText('今天')).toBeTruthy();
});
```

在 `app/src/components/__tests__/TimelineEmptyState.test.tsx` 新建：

```ts
it('renders the empty-state shell and copy', () => {
  const { getByTestId, getByText } = render(<TimelineEmptyState />);
  expect(getByTestId('timeline-empty-state')).toBeTruthy();
  expect(getByText('还没有记忆')).toBeTruthy();
});
```

在 `app/app/(tabs)/__tests__/index.photo.test.ts` 或 `index.voice-cloud-mode.test.ts` 增加：

```ts
expect(screen.getByTestId('home-screen-root')).toHaveStyle({ flex: 1 });
```

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SearchBar.safe-area.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx app/(tabs)/__tests__/index.photo.test.ts app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`

Expected: FAIL，原因应包含缺少 `TimelineSectionHeader` / `TimelineEmptyState` 文件，以及 `SearchBar` / `HomeScreen` 还没有对应 testID。

- [ ] **Step 3: 最小实现首页壳层迁移**

在 `app/tailwind.config.js`：

- 补齐首页第一批 token，至少覆盖：
  - 页面背景
  - 控件表面
  - Timeline 辅助线
  - text/photo/voice 条目语义色
  - 弱边框
  - 卡片圆角和阴影

在 `app/src/components/SearchBar.tsx`：

- 将 `container`、`menuButton`、`searchBox`、`viewModeButton`、`rightActions` 改成 `className`
- 保留 `paddingTop: insets.top` 和 `animatedStyle` 为 `style`
- 给关键节点加 testID：
  - `searchbar-menu-button`
  - `searchbar-search-box`

在 `app/src/components/TimelineSectionHeader.tsx` 和 `TimelineEmptyState.tsx`：

- 提取纯展示壳层
- 使用 `className` 承接原有静态视觉
- 保留时间轴圆点/线段的必要定位 `style`

在 `app/src/components/Timeline.v2.tsx`：

- 接入新的 `TimelineSectionHeader` 和 `TimelineEmptyState`
- 把静态容器、loader 区、filter/search 区、空态容器迁到 `className`
- 保留：
  - `cardSpacing`
  - section 数据
  - loader 定时切换
  - 列表和动画逻辑

在 `app/app/(tabs)/index.tsx`：

- 把根容器和遮罩等静态壳层改为 `className`
- 保留抽屉位移、绝对定位遮罩和录音/上传逻辑的动态 `style`
- 给根容器加 `testID="home-screen-root"`

在 `app/eslint/style-guard-allowlist.js`：

- 移除 `SearchBar.tsx`、`Timeline.v2.tsx`、`app/(tabs)/index.tsx`

- [ ] **Step 4: 重新运行目标测试、lint 和类型检查**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/SearchBar.safe-area.test.tsx src/components/__tests__/TimelineSectionHeader.test.tsx src/components/__tests__/TimelineEmptyState.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx app/(tabs)/__tests__/index.photo.test.ts app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
Expected: PASS

Run: `cd app && npm run lint`
Expected: PASS，且不会再因为 `SearchBar.tsx`、`Timeline.v2.tsx`、`app/(tabs)/index.tsx` 使用 `StyleSheet.create` 通过 allowlist。

Run: `cd app && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/tailwind.config.js app/eslint/style-guard-allowlist.js app/src/components/SearchBar.tsx app/src/components/__tests__/SearchBar.safe-area.test.tsx app/src/components/TimelineSectionHeader.tsx app/src/components/TimelineEmptyState.tsx app/src/components/__tests__/TimelineSectionHeader.test.tsx app/src/components/__tests__/TimelineEmptyState.test.tsx app/src/components/Timeline.v2.tsx app/src/components/__tests__/Timeline.v2.view-mode.test.tsx app/app/'(tabs)'/index.tsx app/app/'(tabs)'/__tests__/index.photo.test.ts app/app/'(tabs)'/__tests__/index.voice-cloud-mode.test.ts
git commit -m "refactor: migrate home shell to nativewind"
```

## Chunk 3: 迁移 `EntryCard` 并收敛样式变体

### Task 3: 把 `EntryCard` 静态视觉迁到 `NativeWind`，并提取条目类型变体映射

**Files:**
- Create: `app/src/components/entryCardVariants.ts`
- Create: `app/src/components/__tests__/entryCardVariants.test.ts`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/EntryCard.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`
- Modify: `app/src/components/__tests__/EntryCard.border-radius.test.tsx`
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定卡片变体映射和现有视觉壳层**

在 `app/src/components/__tests__/entryCardVariants.test.ts` 新建：

```ts
it('returns stable shell classes for text, photo and voice entries', () => {
  expect(getEntryCardVariant('text', 'default')).toMatchObject({
    shellClassName: expect.stringContaining('bg-entry-text'),
  });
  expect(getEntryCardVariant('photo', 'default')).toMatchObject({
    shellClassName: expect.stringContaining('bg-entry-photo'),
  });
  expect(getEntryCardVariant('voice', 'default')).toMatchObject({
    shellClassName: expect.stringContaining('bg-entry-voice'),
  });
});
```

在 `app/src/components/__tests__/EntryCard.border-radius.test.tsx` 补充：

```ts
expect(getByTestId('entry-card-container')).toHaveStyle({ borderRadius: 10 });
expect(getByTestId('entry-card')).toHaveStyle({ borderRadius: 10 });
```

在 `app/src/components/__tests__/EntryCard.missing-media.test.tsx` 保留现有背景色断言，确保迁移后视觉不变。

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/entryCardVariants.test.ts src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.border-radius.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx`

Expected: FAIL，原因应包含缺少 `entryCardVariants.ts` 或新的 test 断言尚未满足。

- [ ] **Step 3: 最小实现 `EntryCard` 迁移**

在 `app/src/components/entryCardVariants.ts`：

- 提供统一入口，例如：

```ts
export function getEntryCardVariant(type: Entry['type'], variant: 'default' | 'calendar') {
  return {
    shellClassName: '...',
    pressedClassName: '...',
    accentClassName: '...',
  };
}
```

在 `app/src/components/EntryCard.tsx`：

- 用 `entryCardVariants` 替换散落的：
  - `getBorderColor()`
  - `getCardBgColor()`
  - `getCardPressedColor()`
- 把静态容器、标签、按钮、说明文字等迁到 `className`
- 保留以下动态 `style`：
  - `Animated.View` 平移动画
  - 音频播放进度
  - Gesture Handler / Swipeable 相关样式
  - 依赖图片高度设置和运行时状态的样式

在 `app/eslint/style-guard-allowlist.js`：

- 移除 `EntryCard.tsx`

- [ ] **Step 4: 重新运行目标测试、lint 和类型检查**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/entryCardVariants.test.ts src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.border-radius.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx`
Expected: PASS

Run: `cd app && npm run lint`
Expected: PASS，且 `EntryCard.tsx` 不再依赖 allowlist 才能通过。

Run: `cd app && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/entryCardVariants.ts app/src/components/__tests__/entryCardVariants.test.ts app/eslint/style-guard-allowlist.js app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx app/src/components/__tests__/EntryCard.border-radius.test.tsx app/src/components/__tests__/EntryCard.missing-media.test.tsx
git commit -m "refactor: migrate entry card to nativewind"
```

## Chunk 4: 收口 `FABMenu`、`Sidebar` 与最终验证

### Task 4: 迁移 `FABMenu` / `Sidebar`，收紧 allowlist，并完成文档与验证收口

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/FABMenu.tsx`
- Modify: `app/src/components/__tests__/FABMenu.peek-hide.test.tsx`
- Create: `app/src/components/__tests__/Sidebar.test.tsx`
- Modify: `app/src/components/Sidebar.tsx`
- Modify: `docs/superpowers/specs/2026-03-23-home-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-home-nativewind-migration.md`

- [ ] **Step 1: 先写失败测试，锁定 FAB 和 Sidebar 的静态壳层**

在 `app/src/components/__tests__/FABMenu.peek-hide.test.tsx` 增加：

```ts
it('keeps the main FAB shell at 56x56 after migration', () => {
  const { getByTestId } = render(<FABMenu onSelect={jest.fn()} />);
  expect(getByTestId('fab-main-button')).toHaveStyle({ width: 56, height: 56, borderRadius: 28 });
});
```

在 `app/src/components/__tests__/Sidebar.test.tsx` 新建：

```ts
it('renders the sidebar shell, menu items and safe-area footer', () => {
  const { getByTestId, getByText } = render(<Sidebar {...props} />);
  expect(getByTestId('sidebar-shell')).toBeTruthy();
  expect(getByText('统计')).toBeTruthy();
  expect(getByTestId('sidebar-footer')).toHaveStyle({ paddingBottom: 16 });
});
```

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/FABMenu.peek-hide.test.tsx src/components/__tests__/Sidebar.test.tsx`

Expected: FAIL，原因应包含缺少新的 testID 或 `Sidebar.test.tsx` 依赖的结构尚未存在。

- [ ] **Step 3: 最小实现 FAB / Sidebar 迁移并收紧 allowlist**

在 `app/src/components/FABMenu.tsx`：

- 把主按钮、选项按钮、tip 气泡和 label 容器迁到 `className`
- 保留：
  - 绝对定位坐标
  - `fanProgress` / `fabTranslateY` animated style
  - PanResponder / hitTest 逻辑
- 给主按钮加 `testID="fab-main-button"`

在 `app/src/components/Sidebar.tsx`：

- 把 sidebar 壳层、header、menu item、icon 容器和 footer 迁到 `className`
- 保留：
  - `drawerProgress` 动画位移
  - `paddingTop: insets.top + 20`
  - `paddingBottom: Math.max(insets.bottom, 16)`
- 给关键节点加 testID：
  - `sidebar-shell`
  - `sidebar-footer`

在 `app/eslint/style-guard-allowlist.js`：

- 移除 `FABMenu.tsx`
- 移除 `Sidebar.tsx`

- [ ] **Step 4: 跑最终验证并回填文档**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/FABMenu.peek-hide.test.tsx src/components/__tests__/Sidebar.test.tsx`
Expected: PASS

Run: `cd app && npm run lint`
Expected: PASS

Run: `cd app && npm run typecheck`
Expected: PASS

Run: `cd app && npm test -- --runInBand`
Expected: 只保留既有失败 `src/__tests__/runtime-regressions.test.ts`；如果出现其它新增失败，先修复再继续收口。

在 `docs/superpowers/specs/2026-03-23-home-nativewind-migration-design.md`：

- 更新实现状态
- 记录最终落地文件
- 记录 lint / typecheck / 测试结果
- 标明基线失败未在本任务中处理

在 `docs/superpowers/plans/2026-03-23-home-nativewind-migration.md`：

- 勾选已完成步骤
- 补齐最终验证结果
- 记录是否存在偏差和已知问题

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/FABMenu.tsx app/src/components/__tests__/FABMenu.peek-hide.test.tsx app/src/components/__tests__/Sidebar.test.tsx app/src/components/Sidebar.tsx docs/superpowers/specs/2026-03-23-home-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-home-nativewind-migration.md
git commit -m "refactor: finish home nativewind migration"
```

# 侧栏二级页 NativeWind 第四批迁移 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重做侧栏二级页视觉和交互的前提下，把 `DetailPageShell`、`AboutPage`、`HelpPage`、`TagsPage` 迁到 `NativeWind`，并继续收紧样式守卫 allowlist。

**Architecture:** 本轮按“共享壳层 -> 最简单列表页 -> 静态信息页 -> FAQ 页面”四个层次分块迁移。每块都先写失败测试，再做最小实现，迁完立刻从 allowlist 中移除对应文件，最后统一跑 lint、typecheck 和全量测试并回填文档状态。

**Tech Stack:** React Native, Expo Router, NativeWind 4, Tailwind CSS, Jest, Testing Library, React Native Reanimated

**Spec:** `docs/superpowers/specs/2026-03-23-sidebar-detail-nativewind-migration-design.md`

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建第四批实现计划，范围固定为 `DetailPageShell`、`AboutPage`、`HelpPage`、`TagsPage`。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。
- 2026-03-23：已按 TDD 顺序完成共享壳层与 3 个侧栏二级页的 NativeWind 迁移、allowlist 收口与文档回填。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/components/__tests__/AboutPage.test.tsx` | 锁定关于页的主要区块渲染与链接跳转行为 |
| `app/src/components/__tests__/HelpPage.test.tsx` | 锁定 FAQ 渲染、展开行为与邮件反馈跳转 |
| `app/src/components/__tests__/TagsPage.test.tsx` | 锁定标签页空态、列表态与点击关闭行为 |

### Modified Files

| File | Change |
|------|--------|
| `app/eslint/style-guard-allowlist.js` | 每完成一个迁移块就移除对应 legacy 文件，继续收紧守卫 |
| `app/src/components/DetailPageShell.tsx` | 把共享详情壳层静态样式迁到 `NativeWind`，保留 modal、动画和 safe area 逻辑 |
| `app/src/components/AboutPage.tsx` | 把关于页静态区块迁到 `NativeWind`，保留文案和链接行为 |
| `app/src/components/HelpPage.tsx` | 把 FAQ 与联系卡片静态壳层迁到 `NativeWind`，保留展开状态和邮件跳转 |
| `app/src/components/TagsPage.tsx` | 把标签页空态和列表态壳层迁到 `NativeWind`，保留统计逻辑和关闭行为 |
| `app/src/components/__tests__/DetailPageShell.test.tsx` | 扩充共享壳层 headerRight、静态内容容器等回归断言 |
| `docs/superpowers/specs/2026-03-23-sidebar-detail-nativewind-migration-design.md` | 实现完成后回填状态、验证结果与偏差说明 |
| `docs/superpowers/plans/2026-03-23-sidebar-detail-nativewind-migration.md` | 执行过程中勾选任务、记录验证结果和收口状态 |

## 执行约束

- 四个组件的展示形态必须保持原样：
  - `DetailPageShell` 仍是右侧滑入的详情壳层
  - `AboutPage` 仍是 logo / 信息区块布局
  - `HelpPage` 仍是 FAQ 列表 + 联系卡片
  - `TagsPage` 仍是空态 / 标签统计列表两种状态
- 不能改现有入口关系：
  - `Sidebar` 继续拉起 `AboutPage`、`HelpPage`、`TagsPage`
  - 这 3 个页面继续通过 `DetailPageShell` 承载
- 只迁静态视觉表达；动画、safe area、运行时高度、透传容器样式允许继续使用 `style`
- 不在组件内部新增新的十六进制颜色；优先复用已有 token，确实不够时才用最小 arbitrary classes 维持现状
- 每完成一个组件迁移，就从 allowlist 中删除对应文件，避免“迁完仍长期放行”

## Chunk 1: DetailPageShell 共享壳层迁移

### Task 1: 扩充 `DetailPageShell` 测试并迁移共享壳层

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/DetailPageShell.tsx`
- Modify: `app/src/components/__tests__/DetailPageShell.test.tsx`

- [x] **Step 1: 先写失败测试，锁定共享壳层结构**

在 `app/src/components/__tests__/DetailPageShell.test.tsx` 增加至少两条断言：

```ts
it('renders the shell header and headerRight slot when provided', () => {
  const { getByTestId, getByText } = render(
    <DetailPageShell
      visible
      title="关于"
      onClose={jest.fn()}
      headerRight={<Text>操作</Text>}
    >
      <Text>body</Text>
    </DetailPageShell>
  );

  expect(getByTestId('detail-page-shell')).toBeTruthy();
  expect(getByTestId('detail-page-header')).toBeTruthy();
  expect(getByTestId('detail-page-header-right')).toBeTruthy();
  expect(getByText('操作')).toBeTruthy();
});

it('keeps rendering the static content container when scroll is disabled', () => {
  const { getByTestId } = render(
    <DetailPageShell visible title="帮助" onClose={jest.fn()} scrollEnabled={false}>
      <Text>body</Text>
    </DetailPageShell>
  );

  expect(getByTestId('detail-page-content')).toBeTruthy();
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/DetailPageShell.test.tsx`

Expected: FAIL，原因应包含 `detail-page-shell` / `detail-page-header` / `detail-page-header-right` 尚不存在。

- [x] **Step 3: 最小实现 `DetailPageShell` NativeWind 迁移**

在 `app/src/components/DetailPageShell.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `Modal`
  - `GestureHandlerRootView`
  - `FadeIn` / `FadeOut`
  - `SlideInRight` / `SlideOutRight`
  - `SCREEN_HEIGHT`
  - `contentContainerStyle`
  - `scrollEnabled`
- 把静态壳层迁到 `className`：
  - container
  - backdrop
  - page
  - header
  - back button
  - header title
  - headerRight / headerSpacer
  - content / staticContent
- 继续保留：
  - `paddingTop: insets.top + 20`
  - `paddingBottom: 40 + insets.bottom`
  - `style={StyleSheet.absoluteFill}` 如有必要
- 补以下 `testID`：
  - `detail-page-shell`
  - `detail-page-header`
  - `detail-page-header-right`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/DetailPageShell.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/DetailPageShell.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/DetailPageShell.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/DetailPageShell.tsx app/src/components/__tests__/DetailPageShell.test.tsx
git commit -m "refactor: migrate detail page shell to nativewind"
```

## Chunk 2: TagsPage 标签页迁移

### Task 2: 新增 `TagsPage` 测试并迁移标签页内容层

**Files:**
- Create: `app/src/components/__tests__/TagsPage.test.tsx`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/TagsPage.tsx`

- [x] **Step 1: 先写失败测试，锁定空态与列表态**

在 `app/src/components/__tests__/TagsPage.test.tsx` 新建测试，mock `useEntryStore` 和 `DetailPageShell`，至少覆盖：

```ts
it('renders the empty state when there are no tags', () => {
  mockUseEntryStore.mockReturnValue({ entries: [] });
  const screen = render(<TagsPage visible onClose={jest.fn()} />);

  expect(screen.getByTestId('tags-page-root')).toBeTruthy();
  expect(screen.getByTestId('tags-page-empty')).toBeTruthy();
  expect(screen.getByText('还没有标签')).toBeTruthy();
});

it('renders tag counts and closes when a tag row is pressed', () => {
  const onClose = jest.fn();
  mockUseEntryStore.mockReturnValue({
    entries: [
      { id: '1', type: 'text', content: 'a', timestamp: 1, tags: ['旅行'], syncStatus: 'synced' },
      { id: '2', type: 'text', content: 'b', timestamp: 2, tags: ['旅行', '工作'], syncStatus: 'synced' },
    ],
  });
  const screen = render(<TagsPage visible onClose={onClose} />);

  expect(screen.getByText('共 2 个标签')).toBeTruthy();
  expect(screen.getByText('#旅行')).toBeTruthy();
  expect(screen.getByText('2 条')).toBeTruthy();

  fireEvent.press(screen.getByText('#旅行'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TagsPage.test.tsx`

Expected: FAIL，原因应包含 `tags-page-root` / `tags-page-empty` 尚不存在。

- [x] **Step 3: 最小实现 `TagsPage` NativeWind 迁移**

在 `app/src/components/TagsPage.tsx`：

- 删除 `StyleSheet.create`
- 保留 `useMemo` 统计逻辑、`contentContainerStyle` 透传和 `onClose` 行为
- 把静态壳层迁到 `className`：
  - hint
  - tagRow
  - tagLeft
  - tagDot
  - tagName
  - tagRight
  - empty
  - emptyText
  - emptyHint
- 空态如仍需通过 `contentContainerStyle` 设置 `flexGrow`，可继续保留最小对象样式
- 补以下 `testID`：
  - `tags-page-root`
  - `tags-page-empty`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/TagsPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/TagsPage.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/TagsPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/TagsPage.tsx app/src/components/__tests__/TagsPage.test.tsx
git commit -m "refactor: migrate tags page to nativewind"
```

## Chunk 3: AboutPage 信息页迁移

### Task 3: 新增 `AboutPage` 测试并迁移关于页内容层

**Files:**
- Create: `app/src/components/__tests__/AboutPage.test.tsx`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/AboutPage.tsx`

- [x] **Step 1: 先写失败测试，锁定区块渲染和链接行为**

在 `app/src/components/__tests__/AboutPage.test.tsx` 新建测试。mock `DetailPageShell` 和 `Linking.openURL`，至少覆盖：

```ts
it('renders the about page sections inside the existing shell', () => {
  const screen = render(<AboutPage visible onClose={jest.fn()} />);

  expect(screen.getByTestId('about-page-root')).toBeTruthy();
  expect(screen.getByText('功能特性')).toBeTruthy();
  expect(screen.getByText('技术栈')).toBeTruthy();
  expect(screen.getByText('更多信息')).toBeTruthy();
});

it('opens the expected links from the info buttons', () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  const screen = render(<AboutPage visible onClose={jest.fn()} />);

  fireEvent.press(screen.getByText('GitHub 仓库'));
  fireEvent.press(screen.getByText('使用文档'));

  expect(openURL).toHaveBeenNthCalledWith(1, 'https://github.com');
  expect(openURL).toHaveBeenNthCalledWith(2, 'https://expo.dev');
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/AboutPage.test.tsx`

Expected: FAIL，原因应包含 `about-page-root` 尚不存在。

- [x] **Step 3: 最小实现 `AboutPage` NativeWind 迁移**

在 `app/src/components/AboutPage.tsx`：

- 删除 `StyleSheet.create`
- 保留 `FeatureItem`、`TechItem`、`Linking.openURL` 行为和现有文案结构
- 把静态壳层迁到 `className`：
  - logoSection
  - logoContainer
  - section
  - sectionTitle
  - featureList / featureItem / featureIcon
  - techStack / techItem
  - linkButton
  - footer
- 优先复用 `primary`、`neutral`、`copy.*`、`home.*`
- 补以下 `testID`：
  - `about-page-root`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/AboutPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/AboutPage.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/AboutPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/AboutPage.tsx app/src/components/__tests__/AboutPage.test.tsx
git commit -m "refactor: migrate about page to nativewind"
```

## Chunk 4: HelpPage FAQ 页面迁移

### Task 4: 新增 `HelpPage` 测试并迁移帮助页内容层

**Files:**
- Create: `app/src/components/__tests__/HelpPage.test.tsx`
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/HelpPage.tsx`

- [x] **Step 1: 先写失败测试，锁定 FAQ 和联系卡片行为**

在 `app/src/components/__tests__/HelpPage.test.tsx` 新建测试。mock `DetailPageShell` 和 `Linking.openURL`，至少覆盖：

```ts
it('renders the FAQ list and contact section inside the existing shell', () => {
  const screen = render(<HelpPage visible onClose={jest.fn()} />);

  expect(screen.getByTestId('help-page-root')).toBeTruthy();
  expect(screen.getByText('常见问题')).toBeTruthy();
  expect(screen.getByText('联系我们')).toBeTruthy();
  expect(screen.getByText('发送反馈邮件')).toBeTruthy();
});

it('expands an faq answer when the item is pressed', () => {
  const screen = render(<HelpPage visible onClose={jest.fn()} />);

  expect(screen.queryByText('点击底部蓝色 + 按钮，选择"文字"，输入内容后点击保存。')).toBeNull();
  fireEvent.press(screen.getByText('如何添加文字记录？'));
  expect(screen.getByText('点击底部蓝色 + 按钮，选择"文字"，输入内容后点击保存。')).toBeTruthy();
});

it('opens the feedback mail link when pressed', () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(true);
  const screen = render(<HelpPage visible onClose={jest.fn()} />);

  fireEvent.press(screen.getByText('发送反馈邮件'));
  expect(openURL).toHaveBeenCalledWith('mailto:support@memorycapsule.app');
});
```

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/HelpPage.test.tsx`

Expected: FAIL，原因应包含 `help-page-root` 尚不存在。

- [x] **Step 3: 最小实现 `HelpPage` NativeWind 迁移**

在 `app/src/components/HelpPage.tsx`：

- 删除 `StyleSheet.create`
- 保留 FAQ `open` 状态逻辑和 `Linking.openURL('mailto:...')`
- 把静态壳层迁到 `className`：
  - sectionTitle
  - faqList
  - faqItem
  - faqHeader
  - faqQ
  - faqA
  - contactCard
  - contactText
  - contactButton
- 优先复用 `primary`、`neutral`、`copy.*`、`border.*`
- 补以下 `testID`：
  - `help-page-root`

- [x] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/HelpPage.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/HelpPage.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/HelpPage.tsx`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/HelpPage.tsx app/src/components/__tests__/HelpPage.test.tsx
git commit -m "refactor: migrate help page to nativewind"
```

## Chunk 5: 文档回填与全量验收

### Task 5: 回填 spec / plan 状态并完成全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-sidebar-detail-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-sidebar-detail-nativewind-migration.md`

- [x] **Step 1: 先跑第四批相关测试集合**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/components/__tests__/DetailPageShell.test.tsx \
  src/components/__tests__/TagsPage.test.tsx \
  src/components/__tests__/AboutPage.test.tsx \
  src/components/__tests__/HelpPage.test.tsx
```

Expected: PASS

- [x] **Step 2: 跑静态检查与全量测试**

Run: `cd app && npm run lint`
Expected: PASS

Run: `cd app && npm run typecheck`
Expected: PASS

Run: `cd app && npm test -- --runInBand`
Expected: PASS

- [x] **Step 3: 回填文档执行结果**

在 spec 与 plan 中补：

- 当前状态
- 实际新增 / 修改文件
- 验证命令及结果
- 若实现与计划有轻微偏差，记录原因

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-sidebar-detail-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-sidebar-detail-nativewind-migration.md
git commit -m "docs: backfill sidebar detail nativewind migration"
```

## 执行结果

- 已完成 `DetailPageShell`、`TagsPage`、`AboutPage`、`HelpPage` 的静态壳层 NativeWind 迁移，侧栏入口关系、FAQ 展开、链接跳转与 `contentContainerStyle` 接口保持不变。
- 已新增 `app/src/components/__tests__/TagsPage.test.tsx`、`app/src/components/__tests__/AboutPage.test.tsx`、`app/src/components/__tests__/HelpPage.test.tsx`，并扩充 `DetailPageShell.test.tsx`。
- 已从 `app/eslint/style-guard-allowlist.js` 移除：
  - `src/components/DetailPageShell.tsx`
  - `src/components/TagsPage.tsx`
  - `src/components/AboutPage.tsx`
  - `src/components/HelpPage.tsx`
- 本轮未新增 Tailwind 语义 token；共享壳层和页面内容优先复用已有 `primary`、`neutral`、`copy.*`、`border.*`、`home.*`，个别边框色使用最小 arbitrary class 保持原视觉。

## 验证结果

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/DetailPageShell.test.tsx src/components/__tests__/TagsPage.test.tsx src/components/__tests__/AboutPage.test.tsx src/components/__tests__/HelpPage.test.tsx`：PASS
- `cd app && npm run lint`：PASS
- `cd app && npm run typecheck`：PASS
- `cd app && npm test -- --runInBand`：PASS

## 本地结构化 Review 结论

- 已按 chunk 检查共享壳层边界、测试顺序、allowlist 收口点和最终验收命令
- 每个组件都可以独立完成“失败测试 -> 最小实现 -> lint 收口 -> 提交”的闭环
- 未发现阻塞执行的问题

# Settings Sync Repair Media Test Granularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为设置页、同步状态、修复入口和与其强耦合的媒体异常路径补齐高颗粒度 Jest 与 Android Maestro 回归。

**Architecture:** 这份计划把 `ST-*` 和本轮 `MD-*` 合在一起执行，因为现有代码里媒体异常、修复提示和同步状态是同一条用户恢复路径。Jest 继续沿用 `settings-page/*`、`CloudSyncStatusButton`、异常媒体组件测试体系，Maestro 则只补 `cloud-sync` 和少量 `app-core` 真闭环，不把所有媒体细枝末节都上到 Android 端。

**Tech Stack:** React Native, Jest, React Native Testing Library, TypeScript, Animated API mocks, Maestro YAML, Android emulator

---

## File Structure

- Modify: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
  Responsibility: 设置页同步状态入口与状态摘要。
- Modify: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
  Responsibility: 修复入口、实验入口、可再次拉起。
- Modify: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`
  Responsibility: 高风险控制项显示稳定性。
- Modify: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
  Responsibility: 同步状态按钮局部结构语义。
- Modify: `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`
  Responsibility: syncing 态动画生命周期。
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`
  Responsibility: 异常媒体基础降级。
- Modify: `app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`
  Responsibility: repairable/repair-pending 等媒体变体。
- Modify: `app/.maestro/flows/app-core/settings-sync-status-open.yaml`
  Responsibility: 从设置页打开同步状态。
- Modify: `app/.maestro/flows/app-core/settings-repair-prompt.yaml`
  Responsibility: 修复提示可再次拉起。
- Modify: `app/.maestro/flows/cloud-sync/suspect-media.yaml`
  Responsibility: suspect 场景可达。
- Modify: `app/.maestro/flows/cloud-sync/repair-later.yaml`
  Responsibility: 稍后修复仍保留恢复路径。
- Modify: `app/.maestro/flows/cloud-sync/repair-confirm.yaml`
  Responsibility: 立即修复后状态回流。
- Modify: `app/.maestro/flows/app-core/image-viewer-back-navigation.yaml`
  Responsibility: 与修复路径强耦合的图片查看器返回。
- Modify: `app/.maestro/README.md`
  Responsibility: 记录 cloud-sync / app-core 新增回归入口。
- Modify: `app/package.json`
  Responsibility: 仅在需要时补最小 `settings-sync-repair` 分组脚本。

## Task 1: Tighten Settings Sync And Repair Jest Coverage

**Files:**
- Modify: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
- Modify: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
- Modify: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`

- [ ] **Step 1: Add the failing sync-entry visibility test**

在 `settings-page.sync-status.test.tsx` 追加：

```tsx
it('hides the sync status entry when the user is unauthenticated', async () => {
  const { screen } = await renderSettingsPage({ authenticated: false });

  expect(screen.queryByText('同步状态')).toBeNull();
});
```

- [ ] **Step 2: Add the failing repair-reopen regression test**

在 `settings-page.repair-entry.test.tsx` 追加：

```tsx
it('keeps the dedicated repair entry available after choosing a repair-pending fixture', async () => {
  const { screen } = await renderSettingsPage({ e2eSyncLab: true });

  fireEvent.press(await screen.findByTestId('e2e-sync-fixture-repair-pending'));
  expect(screen.getByTestId('e2e-sync-show-repair-prompt')).toBeTruthy();
});
```

- [ ] **Step 3: Run the three targeted settings suites**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/settings-page/settings-page.sync-status.test.tsx src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx --runInBand`

Expected: PASS or a focused FAIL describing auth gating / repair-entry regression.

- [ ] **Step 4: If needed, apply only the smallest settings gating fix**

只允许补最小条件渲染或 helper mock 修正，例如：

```tsx
{isAuthenticated ? <SettingsRow title="同步状态" ... /> : null}
```

不要在这一步重构 SettingsPage 分区结构。

- [ ] **Step 5: Re-run the settings suites**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/settings-page/settings-page.sync-status.test.tsx src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx src/components/__tests__/settings-page/settings-page.backend-env.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 6: Commit the settings-page coverage**

```bash
git add app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx app/src/components/SettingsPage.tsx
git commit -m "test(settings): tighten sync and repair coverage"
```

如果没有生产代码改动，不要把 `SettingsPage.tsx` 加进提交。

## Task 2: Tighten Sync Button And Missing-Media Component Coverage

**Files:**
- Modify: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- Modify: `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`
- Modify: `app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`
- Test: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- Test: `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`
- Test: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`
- Test: `app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`

- [ ] **Step 1: Add the failing syncing-structure assertion if missing**

在 `CloudSyncStatusButton.test.tsx` 确认或追加：

```tsx
it('renders only the spinner while syncing', () => {
  const screen = render(<CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />);

  expect(screen.getByTestId('cloud-sync-spinner')).toBeTruthy();
  expect(screen.queryByTestId('cloud-sync-dot-synced')).toBeNull();
  expect(screen.queryByTestId('cloud-sync-dot-pending')).toBeNull();
  expect(screen.queryByTestId('cloud-sync-dot-failed')).toBeNull();
});
```

- [ ] **Step 2: Add the failing repair-pending media variant assertion**

在 `entry-card.missing-media-variants.test.tsx` 追加，继续沿用文件里现有的 `createPhotoEntry()` fixture：

```tsx
it('shows a stable recovery hint for repair-pending media', () => {
  const entry = createPhotoEntry({
    uri: 'file:///local-photo.jpg',
    mimeType: 'image/jpeg',
    size: 10,
    metadata: {
      integrityStatus: 'repair_pending',
      repairable: false,
      createdAt: 1700000000000,
      modifiedAt: 1700000000000,
    },
  });

  const screen = render(<EntryCard entry={entry} onDelete={jest.fn()} />);

  expect(screen.getByTestId('photo-image-0')).toBeTruthy();
  expect(screen.getByText('说明文字')).toBeTruthy();
});
```

- [ ] **Step 3: Run the four targeted suites**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/image/entry-card.missing-media-variants.test.tsx --runInBand`

Expected: PASS or focused FAILs describing real UI semantic gaps.

- [ ] **Step 4: If needed, apply the smallest component fixes**

只允许：

- 补最小 `testID`
- 修正 syncing / dot 互斥显示
- 修正 repair-pending 文案或降级提示

不要在这一步扩展媒体产品能力或重写动画实现。

- [ ] **Step 5: Re-run the four suites**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/image/entry-card.missing-media-variants.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 6: Commit the sync/media component coverage**

```bash
git add app/src/components/__tests__/CloudSyncStatusButton.test.tsx app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx app/src/components/__tests__/EntryCard.missing-media.test.tsx app/src/components/__tests__/image/entry-card.missing-media-variants.test.tsx app/src/components/CloudSyncStatusButton.tsx app/src/components/EntryCard.tsx
git commit -m "test(sync): tighten status and media variants"
```

如果没有生产代码改动，提交里只保留测试文件。

## Task 3: Finish Cloud-Sync And Viewer Android Flows

**Files:**
- Modify: `app/.maestro/flows/app-core/settings-sync-status-open.yaml`
- Modify: `app/.maestro/flows/app-core/settings-repair-prompt.yaml`
- Modify: `app/.maestro/flows/cloud-sync/suspect-media.yaml`
- Modify: `app/.maestro/flows/cloud-sync/repair-later.yaml`
- Modify: `app/.maestro/flows/cloud-sync/repair-confirm.yaml`
- Modify: `app/.maestro/flows/app-core/image-viewer-back-navigation.yaml`
- Modify: `app/.maestro/README.md`
- Modify: `app/package.json`
- Test: `app/.maestro/flows/app-core/settings-sync-status-open.yaml`
- Test: `app/.maestro/flows/app-core/settings-repair-prompt.yaml`
- Test: `app/.maestro/flows/cloud-sync/suspect-media.yaml`
- Test: `app/.maestro/flows/cloud-sync/repair-later.yaml`
- Test: `app/.maestro/flows/cloud-sync/repair-confirm.yaml`
- Test: `app/.maestro/flows/app-core/image-viewer-back-navigation.yaml`

- [ ] **Step 1: Keep each Maestro flow single-purpose and explicit**

确认这些 flow 的主断言分别是：

- `settings-sync-status-open.yaml`: 设置页打开同步状态
- `settings-repair-prompt.yaml`: 修复提示可再次拉起
- `suspect-media.yaml`: suspect 场景提示可达
- `repair-later.yaml`: 稍后修复后仍保留恢复路径
- `repair-confirm.yaml`: 确认修复后状态回流
- `image-viewer-back-navigation.yaml`: 图片查看器返回首页或来源页

不要在单个 YAML 里混入多个业务结论。

- [ ] **Step 2: Run the app-core and cloud-sync flows one by one**

Run:

```bash
cd app
maestro test .maestro/flows/app-core/settings-sync-status-open.yaml
maestro test .maestro/flows/app-core/settings-repair-prompt.yaml
maestro test .maestro/flows/cloud-sync/suspect-media.yaml
maestro test .maestro/flows/cloud-sync/repair-later.yaml
maestro test .maestro/flows/cloud-sync/repair-confirm.yaml
maestro test .maestro/flows/app-core/image-viewer-back-navigation.yaml
```

Expected: 逐条 PASS；若失败，失败信息应直接指向入口 `id`、fixture 注入或返回层级。

- [ ] **Step 3: Add the smallest grouped execution entry only if it reduces manual repetition**

如果需要，在 `app/package.json` 增加：

```json
"test:frontend:settings-sync": "jest --runInBand --runTestsByPath src/components/__tests__/settings-page/settings-page.sync-status.test.tsx src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx src/components/__tests__/CloudSyncStatusButton.test.tsx src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx"
```

保持媒体 Jest 套件单独跑，不强绑进这个脚本。

- [ ] **Step 4: Update Maestro docs with the exact flow commands**

在 `app/.maestro/README.md` 增补：

```md
maestro test app/.maestro/flows/app-core/settings-sync-status-open.yaml
maestro test app/.maestro/flows/app-core/settings-repair-prompt.yaml
maestro test app/.maestro/flows/cloud-sync/suspect-media.yaml
maestro test app/.maestro/flows/cloud-sync/repair-later.yaml
maestro test app/.maestro/flows/cloud-sync/repair-confirm.yaml
maestro test app/.maestro/flows/app-core/image-viewer-back-navigation.yaml
```

- [ ] **Step 5: Commit the Android sync and media flow updates**

```bash
git add app/.maestro/flows/app-core/settings-sync-status-open.yaml app/.maestro/flows/app-core/settings-repair-prompt.yaml app/.maestro/flows/cloud-sync/suspect-media.yaml app/.maestro/flows/cloud-sync/repair-later.yaml app/.maestro/flows/cloud-sync/repair-confirm.yaml app/.maestro/flows/app-core/image-viewer-back-navigation.yaml app/.maestro/README.md app/package.json
git commit -m "test(maestro): expand sync repair and media flows"
```

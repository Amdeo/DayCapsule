# Remove Auto Backup Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除设置页中的自动备份开关，并把后台本地 ZIP 备份收敛为默认开启的节流策略。

**Architecture:** 设置页、控制器和 `settingsStore` 不再暴露 `autoBackup`。应用根布局进入后台时只依赖 `BackupService.shouldBackup()` 判定是否需要自动备份，保留原有备份服务实现与节流窗口。

**Tech Stack:** React Native, Expo Router, Zustand, Jest, Testing Library

---

### Task 1: 写回归测试覆盖新行为

**Files:**
- Modify: `app/src/components/__tests__/settings-page/settings-page.preferences.test.tsx`
- Modify: `app/src/__tests__/runtime-regressions.test.ts`
- Modify: `app/src/components/__tests__/helpers/renderSettingsPage.tsx`

- [ ] **Step 1: 写失败测试，断言设置页不再渲染自动备份开关**

```ts
expect(screen.queryByTestId('settings-switch-auto-backup')).toBeNull();
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npx jest src/components/__tests__/settings-page/settings-page.preferences.test.tsx src/__tests__/runtime-regressions.test.ts --runInBand --no-coverage`
Expected: FAIL，因为当前实现仍渲染开关并读取 `settings:autoBackup`

- [ ] **Step 3: 调整测试辅助默认数据**

```ts
// 去掉 autoBackup mock 字段与 setter
```

- [ ] **Step 4: 再次运行目标测试，确认仍只因生产代码未修改而失败**

Run: `cd app && npx jest src/components/__tests__/settings-page/settings-page.preferences.test.tsx src/__tests__/runtime-regressions.test.ts --runInBand --no-coverage`
Expected: FAIL，失败点聚焦在生产代码断言

### Task 2: 最小实现移除开关并常驻后台自动备份

**Files:**
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Modify: `app/src/components/settings-page/useSettingsPageController.ts`
- Modify: `app/src/components/SettingsPage.tsx`
- Modify: `app/src/store/settingsStore.ts`
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1: 删除设置页自动备份 props、回调与 UI**

```tsx
// 移除 autoBackup / onAutoBackupChange 及对应 SettingItem
```

- [ ] **Step 2: 从 settingsStore 中删除 autoBackup 状态与存储逻辑**

```ts
// 删除 settings:autoBackup 相关默认值、load、set、reset
```

- [ ] **Step 3: 将后台自动备份改为仅依赖 shouldBackup**

```ts
if (await BackupService.shouldBackup()) {
  await BackupService.createBackup(entries)
}
```

- [ ] **Step 4: 运行目标测试确认通过**

Run: `cd app && npx jest src/components/__tests__/settings-page/settings-page.preferences.test.tsx src/__tests__/runtime-regressions.test.ts --runInBand --no-coverage`
Expected: PASS

### Task 3: 跑相关设置页回归测试

**Files:**
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.preferences.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.sync-status.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.repair-entry.test.tsx`
- Test: `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`

- [ ] **Step 1: 运行设置页测试组**

Run: `cd app && npm run test:frontend:settings`
Expected: PASS

- [ ] **Step 2: 如有回归，做最小修复并重跑**

Run: `cd app && npm run test:frontend:settings`
Expected: PASS

- [ ] **Step 3: 记录变更涉及的实际验证结果**

```md
- settings preferences tests pass
- runtime regression tests pass
```

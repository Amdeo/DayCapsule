# 云恢复照片远端回退 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复云恢复后的照片记录在新设备上仍引用旧本地路径，导致时间轴或图片查看器空白的问题。

**Architecture:** 保持现有 `MediaCacheService` 和同步链路不动，只在前端照片展示层增加统一的“首选地址 + 失败回退地址”策略。`PhotoService` 负责选源，`PhotoGrid`、日历照片卡和图片查看器只负责消费统一结果，从而避免不同组件各自写一套判断。

**Tech Stack:** React Native, TypeScript, Expo, Jest, @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-03-25-photo-remote-fallback-design.md`

---

### Task 1: 先用失败测试锁定照片源选择规则

**Files:**
- Modify: `app/src/services/__tests__/photoService.test.ts`

- [ ] **Step 1: 为 `PhotoService` 增加首选大图地址测试**

写一个测试证明：

```ts
expect(
  PhotoService.getPreferredPhotoUri(
    {
      uri: 'file:///cache/photo.jpg',
      remoteUri: 'http://101.43.120.134:8081/api/media/photo-1',
      mimeType: 'image/jpeg',
      size: 1,
    },
    'full'
  )
).toBe('file:///cache/photo.jpg');
```

- [ ] **Step 2: 为 `PhotoService` 增加缩略图失败回退测试**

写一个测试证明：

```ts
expect(
  PhotoService.getFallbackPhotoUri(
    {
      uri: 'file:///stale/photo.jpg',
      remoteUri: 'http://101.43.120.134:8081/api/media/photo-1',
      thumbnail: 'file:///stale/thumb.jpg',
      remoteThumbnail: 'http://101.43.120.134:8081/api/media/photo-1-thumb',
      mimeType: 'image/jpeg',
      size: 1,
    },
    'file:///stale/thumb.jpg',
    'thumbnail'
  )
).toBe('http://101.43.120.134:8081/api/media/photo-1-thumb');
```

- [ ] **Step 3: 运行测试并确认当前失败**

Run: `cd app && npm test -- src/services/__tests__/photoService.test.ts --runInBand`

Expected: 失败，提示新方法不存在或返回值不符合预期。

### Task 2: 先实现 `PhotoService` 的最小选源能力

**Files:**
- Modify: `app/src/services/photoService.ts`
- Test: `app/src/services/__tests__/photoService.test.ts`

- [ ] **Step 1: 在 `PhotoService` 中新增候选地址收集函数**

新增纯函数，按 `kind` 生成候选顺序：

```ts
static getPreferredPhotoUri(media: MediaInfo, kind: 'thumbnail' | 'full'): string
static getFallbackPhotoUri(media: MediaInfo, failedUri: string, kind: 'thumbnail' | 'full'): string | null
```

- [ ] **Step 2: 统一通过 `resolvePhotoUri` 输出最终地址**

对每个候选值都走 `resolvePhotoUri`，确保：

- 远端地址继续走远端归一化
- 旧本地 `media/photos/original/` 路径继续按现有逻辑修正

- [ ] **Step 3: 重新运行 `photoService` 测试并确认变绿**

Run: `cd app && npm test -- src/services/__tests__/photoService.test.ts --runInBand`

Expected: PASS

### Task 3: 用失败测试锁定图片卡片的远端回退行为

**Files:**
- Modify: `app/src/components/__tests__/PhotoGrid.test.tsx`

- [ ] **Step 1: 新增单图缩略图失败后回退到远端地址的测试**

测试思路：

1. 渲染一张同时带 `thumbnail` 和 `remoteThumbnail` 的图
2. 先断言首屏 `source.uri` 为本地 `thumbnail`
3. 触发 `error`
4. 断言同一个 `photo-image-0` 的 `source.uri` 已切到 `remoteThumbnail`

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `cd app && npm test -- src/components/__tests__/PhotoGrid.test.tsx --runInBand`

Expected: 失败，当前实现会直接进入 missing 状态或保持旧地址。

### Task 4: 在 `PhotoGrid` 中实现最小远端回退

**Files:**
- Modify: `app/src/components/photo-grid/PhotoGridCells.tsx`
- Test: `app/src/components/__tests__/PhotoGrid.test.tsx`

- [ ] **Step 1: 为 `SinglePhoto` 增加当前 `sourceUri` 状态**

初始值：

```ts
PhotoService.getPreferredPhotoUri(photo, 'thumbnail')
```

- [ ] **Step 2: 在 `onError` 中优先切到远端回退地址**

逻辑要求：

- 若存在新的 fallback 地址，更新 `sourceUri`
- 只有当没有 fallback 地址时，才设置 `error = true`

- [ ] **Step 3: 用同样模式改造 `GridCell` 和 `TwoPhotoCell`**

确保普通网格、双图拼贴、单图卡片行为一致。

- [ ] **Step 4: 重新运行 `PhotoGrid` 测试并确认变绿**

Run: `cd app && npm test -- src/components/__tests__/PhotoGrid.test.tsx --runInBand`

Expected: PASS

### Task 5: 用失败测试锁定图片查看器的大图回退

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 新增“查看器优先回退到远端大图地址”测试**

构造一个 photo entry：

```ts
media: [
  {
    uri: 'file:///stale/photo.jpg',
    remoteUri: 'http://101.43.120.134:8081/api/media/photo-1',
    mimeType: 'image/jpeg',
    size: 2048,
  },
]
```

点击图片卡片后，断言 mocked `ImageViewer` 收到的是远端地址，而不是旧本地地址。

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `cd app && npm test -- src/components/__tests__/EntryCard.test.tsx --runInBand`

Expected: 失败，当前实现仍把旧 `uri` 传给查看器。

### Task 6: 在查看器入口和日历照片卡接入统一选源

**Files:**
- Modify: `app/src/components/entry-card/EntryCardDialogs.tsx`
- Modify: `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: `EntryCardDialogs` 改为使用 `getPreferredPhotoUri(media, 'full')`**

确保查看器的大图优先吃：

- 当前设备可用本地地址
- 否则回退 `remoteUri`

- [ ] **Step 2: 日历照片卡统一改为 `getPreferredPhotoUri(media, 'thumbnail')`**

避免普通卡片和日历卡片行为分叉。

- [ ] **Step 3: 重新运行 `EntryCard` 测试并确认变绿**

Run: `cd app && npm test -- src/components/__tests__/EntryCard.test.tsx --runInBand`

Expected: PASS

### Task 7: 做最终回归并提交

**Files:**
- Modify: `docs/superpowers/specs/2026-03-25-photo-remote-fallback-design.md`
- Modify: `docs/superpowers/plans/2026-03-25-photo-remote-fallback.md`
- Modify: `app/src/services/photoService.ts`
- Modify: `app/src/services/__tests__/photoService.test.ts`
- Modify: `app/src/components/photo-grid/PhotoGridCells.tsx`
- Modify: `app/src/components/__tests__/PhotoGrid.test.tsx`
- Modify: `app/src/components/entry-card/EntryCardDialogs.tsx`
- Modify: `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 运行最终前端回归**

Run:

```bash
cd app && npm test -- src/services/__tests__/photoService.test.ts --runInBand
cd app && npm test -- src/components/__tests__/PhotoGrid.test.tsx --runInBand
cd app && npm test -- src/components/__tests__/EntryCard.test.tsx --runInBand
```

Expected: 全部 PASS

- [ ] **Step 2: 如有必要，再跑一次后端基线确认未受影响**

Run: `cd backend && go test ./...`

Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add docs/superpowers/specs/2026-03-25-photo-remote-fallback-design.md \
  docs/superpowers/plans/2026-03-25-photo-remote-fallback.md \
  app/src/services/photoService.ts \
  app/src/services/__tests__/photoService.test.ts \
  app/src/components/photo-grid/PhotoGridCells.tsx \
  app/src/components/__tests__/PhotoGrid.test.tsx \
  app/src/components/entry-card/EntryCardDialogs.tsx \
  app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx \
  app/src/components/__tests__/EntryCard.test.tsx
git commit -m "fix(photo): fallback to remote uri when local image is stale"
```

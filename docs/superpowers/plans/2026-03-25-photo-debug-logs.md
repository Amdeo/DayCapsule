# 开发环境图片链路调试日志 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为开发环境下的图片查询、缓存、选源和查看器链路增加定点调试日志，帮助定位真机图片空白问题。

**Architecture:** 不调整现有图片显示逻辑，只在四个关键边界层增加日志：数据库查询、媒体缓存 hydrate、照片选源、查看器入口与加载失败。所有日志通过现有 `logger.log` 输出，因此天然只在开发环境生效。

**Tech Stack:** React Native, TypeScript, Expo, Jest, @testing-library/react-native

---

### Task 1: 先写日志行为的失败测试

**Files:**
- Modify: `app/src/services/__tests__/photoService.test.ts`
- Modify: `app/src/services/__tests__/mediaCacheService.test.ts`
- Modify: `app/src/database/__tests__/operations.test.ts`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 在 `photoService.test.ts` 写首选/回退日志测试**

断言：

- 调用 `getPreferredPhotoUri(..., 'full')` 后，`logger.log` 收到 `[photoService] preferred photo uri`
- 调用 `getFallbackPhotoUri(..., failedUri, 'thumbnail')` 后，`logger.log` 收到 `[photoService] fallback photo uri`

- [ ] **Step 2: 在 `mediaCacheService.test.ts` 写 photo hydrate 摘要日志测试**

断言：

- `MediaCacheService.hydrateEntries()` 处理 photo 后，`logger.log` 收到 `[mediaCache] photo hydrate summary`

- [ ] **Step 3: 在 `operations.test.ts` 写 photo 查询摘要日志测试**

断言：

- `getEntriesPage({ type: 'photo' }, 20)` 返回 photo 记录时，`logger.log` 收到 `[db:getEntriesPage] photo media snapshot`

- [ ] **Step 4: 在 `EntryCard.test.tsx` 写查看器入口日志测试**

断言：

- 点击图片卡片后，`logger.log` 收到 `[EntryCardDialogs] opening image viewer`

- [ ] **Step 5: 运行测试并确认当前失败**

Run:

```bash
cd app && pnpm test -- src/services/__tests__/photoService.test.ts --runInBand
cd app && pnpm test -- src/services/__tests__/mediaCacheService.test.ts --runInBand
cd app && pnpm test -- src/database/__tests__/operations.test.ts --runInBand
cd app && pnpm test -- src/components/__tests__/EntryCard.test.tsx --runInBand
```

Expected: 至少新增的日志断言失败。

### Task 2: 实现数据库、缓存与选源日志

**Files:**
- Modify: `app/src/database/operations.ts`
- Modify: `app/src/services/mediaCacheService.ts`
- Modify: `app/src/services/photoService.ts`

- [ ] **Step 1: 在 `getEntriesPage` 打印 photo 查询摘要**

只针对 photo 记录打印：

- `entryId`
- `mediaCount`
- `uri`
- `remoteUri`
- `thumbnail`
- `remoteThumbnail`

- [ ] **Step 2: 在 `hydrateEntry` 打印 photo hydrate 前后对比**

只针对 `entry.type === 'photo'` 且存在 `media` 的记录打印前后路径变化。

- [ ] **Step 3: 在 `PhotoService` 打印首选与回退日志**

打印：

- `kind`
- 候选地址列表
- 选择结果
- `failedUri`（回退场景）

- [ ] **Step 4: 运行对应测试并确认变绿**

Run:

```bash
cd app && pnpm test -- src/services/__tests__/photoService.test.ts --runInBand
cd app && pnpm test -- src/services/__tests__/mediaCacheService.test.ts --runInBand
cd app && pnpm test -- src/database/__tests__/operations.test.ts --runInBand
```

### Task 3: 实现查看器入口与失败日志

**Files:**
- Modify: `app/src/components/entry-card/EntryCardDialogs.tsx`
- Modify: `app/src/components/image-viewer/ImageViewerScene.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 在 `EntryCardDialogs` 打印查看器入口日志**

打印：

- `entryId`
- `selectedImageIndex`
- `selectedMedia`
- `preferredViewerUri`

- [ ] **Step 2: 在 `ImageViewerScene` 的图片组件上增加失败日志**

对 opening/closing 的 `Animated.Image` 和 open 状态的 `Image` 都打印：

- `phase`
- `imageUri`

- [ ] **Step 3: 运行 `EntryCard` 测试并确认变绿**

Run:

```bash
cd app && pnpm test -- src/components/__tests__/EntryCard.test.tsx --runInBand
```

### Task 4: 最终回归并提交

**Files:**
- Modify: `docs/superpowers/specs/2026-03-25-photo-debug-logs-design.md`
- Modify: `docs/superpowers/plans/2026-03-25-photo-debug-logs.md`
- Modify: `app/src/database/operations.ts`
- Modify: `app/src/services/mediaCacheService.ts`
- Modify: `app/src/services/photoService.ts`
- Modify: `app/src/components/entry-card/EntryCardDialogs.tsx`
- Modify: `app/src/components/image-viewer/ImageViewerScene.tsx`
- Modify: `app/src/database/__tests__/operations.test.ts`
- Modify: `app/src/services/__tests__/mediaCacheService.test.ts`
- Modify: `app/src/services/__tests__/photoService.test.ts`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 运行完整前端回归**

Run:

```bash
cd app && pnpm test -- src/services/__tests__/photoService.test.ts --runInBand
cd app && pnpm test -- src/services/__tests__/mediaCacheService.test.ts --runInBand
cd app && pnpm test -- src/database/__tests__/operations.test.ts --runInBand
cd app && pnpm test -- src/components/__tests__/EntryCard.test.tsx --runInBand
cd app && pnpm run typecheck
```

- [ ] **Step 2: 提交**

```bash
git add docs/superpowers/specs/2026-03-25-photo-debug-logs-design.md \
  docs/superpowers/plans/2026-03-25-photo-debug-logs.md \
  app/src/database/operations.ts \
  app/src/services/mediaCacheService.ts \
  app/src/services/photoService.ts \
  app/src/components/entry-card/EntryCardDialogs.tsx \
  app/src/components/image-viewer/ImageViewerScene.tsx \
  app/src/database/__tests__/operations.test.ts \
  app/src/services/__tests__/mediaCacheService.test.ts \
  app/src/services/__tests__/photoService.test.ts \
  app/src/components/__tests__/EntryCard.test.tsx
git commit -m "chore(photo): add dev diagnostics for image flow"
```

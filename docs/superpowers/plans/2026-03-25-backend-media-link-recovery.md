# 后端媒体关联恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复云恢复历史图片记录被导出为旧本地 `file://` 路径的问题，并保证后续 `sync_v2` 写入会自动建立媒体关联。

**Architecture:** 在后端同时修正“写入链路”和“导出链路”。`SyncV2Service` 在 create / update 成功后解析媒体 URL 并补建 `media_files.entry_id`；`EntryService` 在 linked media 缺失时，按历史 `file://` 文件名恢复媒体并回退为标准 `/api/media/{id}`。

**Tech Stack:** Go, SQLite, repository/service pattern, Go testing

**Spec:** `docs/superpowers/specs/2026-03-25-backend-media-link-recovery-design.md`

---

### Task 1: 用失败测试锁定历史图片导出恢复

**Files:**
- Modify: `backend/internal/service/entry_service_test.go`

- [ ] **Step 1: 新增历史 `file://` 图片回退测试**

写一个测试证明：

- `entries.media` 里只有旧本地 `file:///.../photo.jpg`
- `media_files` 中存在同用户、同文件名、未关联 entry 的图片
- `EntryService.GetPage()` 返回的 `media[0].uri` 应为 `http://<base>/api/media/<id>`

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `cd backend && go test ./internal/service -run TestEntryServiceRecoversHistoricalFileMediaFromUploadedFile`

Expected: FAIL，当前实现会把 `file://` 原样返回。

### Task 2: 用失败测试锁定 sync_v2 自动建媒体关联

**Files:**
- Modify: `backend/internal/service/sync_v2_service_test.go`

- [ ] **Step 1: 新增 sync_v2 create 自动建立媒体关联测试**

写一个测试证明：

- 先插入一条 `media_files` 记录但不关联 entry
- 用 `sync_v2` create 写入 `media` JSON，其中 `remoteUri` 指向 `/api/media/<id>`
- 同步成功后，`media_files.entry_id` 应等于 entry ID

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `cd backend && go test ./internal/service -run TestSyncV2ServiceLinksMediaFilesReferencedByRemoteURI`

Expected: FAIL，当前实现不会建立关联。

### Task 3: 实现最小仓储和导出恢复逻辑

**Files:**
- Modify: `backend/internal/repository/media_repo.go`
- Modify: `backend/internal/service/entry_service.go`
- Test: `backend/internal/service/entry_service_test.go`

- [ ] **Step 1: 在 `MediaRepository` 增加按 `userID + filename` 查媒体**
- [ ] **Step 2: 在 `EntryService` fallback 阶段识别本地 `file://` 并恢复成标准媒体 URL**
- [ ] **Step 3: 找到匹配媒体后补建 `entry_id` 关联**
- [ ] **Step 4: 重新运行 entry service 测试并确认变绿**

Run: `cd backend && go test ./internal/service -run TestEntryServiceRecoversHistoricalFileMediaFromUploadedFile`

Expected: PASS

### Task 4: 实现 sync_v2 自动建媒体关联

**Files:**
- Modify: `backend/internal/service/sync_v2_service.go`
- Test: `backend/internal/service/sync_v2_service_test.go`

- [ ] **Step 1: 在 `SyncV2Service` 中注入 `mediaRepo`**
- [ ] **Step 2: create / update 成功后解析媒体 JSON 中的 `/api/media/{id}`**
- [ ] **Step 3: 对识别出的媒体调用 `LinkToEntry`**
- [ ] **Step 4: 重新运行 sync_v2 测试并确认变绿**

Run: `cd backend && go test ./internal/service -run TestSyncV2ServiceLinksMediaFilesReferencedByRemoteURI`

Expected: PASS

### Task 5: 做最终回归

**Files:**
- Modify: `backend/internal/repository/media_repo.go`
- Modify: `backend/internal/service/entry_service.go`
- Modify: `backend/internal/service/sync_v2_service.go`
- Modify: `backend/internal/service/entry_service_test.go`
- Modify: `backend/internal/service/sync_v2_service_test.go`
- Modify: `docs/superpowers/specs/2026-03-25-backend-media-link-recovery-design.md`
- Modify: `docs/superpowers/plans/2026-03-25-backend-media-link-recovery.md`

- [ ] **Step 1: 跑最终后端回归**

Run: `cd backend && go test ./internal/service/... ./internal/repository/...`

Expected: PASS

- [ ] **Step 2: 提交**

```bash
git add backend/internal/repository/media_repo.go \
  backend/internal/service/entry_service.go \
  backend/internal/service/sync_v2_service.go \
  backend/internal/service/entry_service_test.go \
  backend/internal/service/sync_v2_service_test.go \
  docs/superpowers/specs/2026-03-25-backend-media-link-recovery-design.md \
  docs/superpowers/plans/2026-03-25-backend-media-link-recovery.md
git commit -m "fix(sync): recover historical media links on export"
```

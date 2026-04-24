# MemoryCapsule 项目优化实施报告

> 生成时间：2026-04-24

## 已完成的优化项

### A. 安全类

| 编号 | 优化项 | 修改文件 | 验证 |
|:---:|------|---------|:---|
| **A3** | Nginx 添加安全响应头 | `deploy/backend/daycapsule.conf`, `daycapsule.host-nginx.conf`, `nginx.conf` | 配置文件已更新 |
| **A4** | Refresh Token 服务端存储 + 撤销机制 | `migrations/005_refresh_token.up.sql`, `models/user.go`, `repository/user_repo.go`, `service/auth_service.go`, `handlers/auth.go`, `cmd/server/main.go`, `pkg/utils/jwt.go` | `go test ./...` 通过 |

### B. 性能类

| 编号 | 优化项 | 修改文件 | 验证 |
|:---:|------|---------|:---|
| **B1** | 密码校验正则提取为包级变量 | `backend/internal/service/auth_service.go` | `go test ./...` 通过 |
| **B2** | Tags 搜索改用关联表（替代 `LIKE %%"tag"%%`） | `migrations/006_entry_tags.up.sql`, `backend/internal/repository/entry_repo.go`, `backend/internal/config/schema.go` | `go test ./...` 通过 |

### C. 可维护性 / 代码质量

| 编号 | 优化项 | 修改文件 | 验证 |
|:---:|------|---------|:---|
| **C1** | 定义哨兵错误，替换字符串比较 | `backend/internal/repository/entry_repo.go`, `service/auth_service.go`, `sync_service.go`, `entry_service.go`, `handlers/auth.go`, `entry.go`, `sync.go` | `go test ./...` 通过 |
| **C2** | EntryStore CRUD 去重 | `app/src/store/entryStore.ts` | `tsc --noEmit` 通过 |
| **C3** | 上传队列共享提取 | `app/src/services/uploadQueueShared.ts`, `photoUploadQueue.ts`, `voiceUploadQueue.ts` | `tsc --noEmit` 通过 |
| **C5** | 提取 `testutil` 包并清理部分重复 schema setup | `backend/internal/testutil/db.go`, `repository/entry_repo_test.go`, `service/auth_service_test.go`, `service/entry_service_test.go`, `service/sync_overview_service_test.go`, `service/sync_v2_service_test.go` | `go test ./...` 通过 |
| **C6** | Query 拼接改善 | `backend/internal/repository/entry_repo.go` | `go test ./...` 通过 |

### E. App 前端

| 编号 | 优化项 | 修改文件 | 验证 |
|:---:|------|---------|:---|
| **E1** | 移除废弃 Tab 导航 | `app/app/(tabs)/two.tsx` (已删除), `_layout.tsx` | `tsc --noEmit` 通过 |
| **E3** | API Client URL-keyed 缓存 | `app/src/services/apiClient.ts` | `tsc --noEmit` 通过 |
| **E4** | 错误提示差异化（加载失败添加"重试"按钮） | `app/src/components/home/useHomeScreenController.ts` | `tsc --noEmit` 通过 |
| **E2** | 样式文件瘦身（TextEditor 示范） | `app/src/components/TextEditor.tsx`, `text-editor/TextEditor.styles.ts` | `tsc --noEmit` 通过 |

---

## 最小化/部分完成的项

| 编号 | 说明 |
|:---:|------|
| **C3** | 仅提取了共享常量和辅助函数（`RETRY_BACKOFF_MS`, `consumeCanceledEntry`）。完整的泛化工厂函数（`createMediaUploadQueue`）因涉及 ~200 行重构且需保持类型安全，建议后续专项处理。 |
| **C5** | `testutil` 包已创建，并已用于 `repository/entry_repo_test.go` 和 `service/auth_service_test.go`；同时清理了部分 service 测试中的重复 migration 代码。其他测试文件里的 `setup*TestDB` 仍可后续继续收口到统一 helper。 |
| **E2** | 仅改善了 `TextEditor.tsx` 组件（7 处样式改为 Tailwind className，`TextEditor.styles.ts` 减少 ~60 行）。其他大样式文件（`EntryCard.styles.ts` 593行、`SettingsPage.styles.ts` 339行等）建议后续专项处理。 |

---

## 未实施的项

| 编号 | 原因 |
|:---:|------|
| **C4** | Sync V2 统一事务路径 — `sync_v2_service.go` ~741 行，同时维护"事务路径"和"非事务路径"两套逻辑。完整重构需统一接口、调整所有测试 Fake 实现，风险高、工作量大，建议单独排期。 |

---

## 验证结果

- **Backend**: `cd backend && go test ./...` ✅ 全部通过
- **App**: `cd app && npx tsc --noEmit` ✅ 无类型错误

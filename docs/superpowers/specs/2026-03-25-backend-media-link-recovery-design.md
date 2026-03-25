# 后端媒体关联恢复设计

**日期**: 2026-03-25
**状态**: 已批准
**阶段**: Android 真机云恢复图片空白修复

## 目标

修复云恢复后的历史 photo 记录在服务端导出时仍返回旧本地 `file://` 路径，导致客户端恢复后图片为空白的问题。

这次只修复后端两段链路：

1. `sync_v2` 写入 entry 时自动建立 `media_files.entry_id` 关联
2. 导出历史坏记录时，按文件名恢复孤儿媒体并输出 `/api/media/{id}`

---

## 问题归因

当前图片文件本身已经上传成功，服务端上传目录也存在可打开的原图，因此问题不在 nginx，也不在磁盘文件缺失。

真正的缺口在于：

- `sync_v2` 只把客户端传来的媒体 JSON 存入 `entries.media`
- 它不会把对应媒体关联到 `media_files.entry_id`
- 导出时 `EntryService` 优先按 `entry_id` 查媒体
- 查不到才回退使用 `entries.media`
- 历史 `entries.media` 里可能保存的是旧设备本地 `file://...jpg`

因此客户端收到的就是坏路径，而不是前端把好路径渲染坏了。

---

## 设计决策

采用后端双修复方案，优先保证未来数据正确，同时兜底修复历史数据。

### 一、未来写入修复

`SyncV2Service` 在 create / update 成功写入 entry 后，解析 `entry.Media` 中的媒体地址：

- 如果地址本身是 `/api/media/{id}` 或完整媒体 URL，提取 `mediaID`
- 调用 `mediaRepo.LinkToEntry(mediaID, entry.ID)` 建立关联

这样后续导出就能直接从 `media_files` 走标准媒体列表，不再依赖 `entries.media` 中的历史快照。

### 二、历史导出修复

`EntryService.toResponse()` 在 linked media 为空时继续走 fallback，但新增一层恢复逻辑：

- 若 fallback 出来的媒体 URI 是本地 `file://`
- 提取 basename
- 按 `userID + filename` 到 `media_files` 里找候选媒体
- 找到后返回标准 `/api/media/{id}`
- 同时尝试补建 `entry_id` 关联，减少后续重复恢复

---

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `backend/internal/repository/media_repo.go` | 修改 | 增加按 `userID + filename` 查媒体能力 |
| `backend/internal/service/entry_service.go` | 修改 | 导出 fallback 时恢复历史孤儿媒体并自愈关联 |
| `backend/internal/service/sync_v2_service.go` | 修改 | create / update 成功后补建媒体关联 |
| `backend/internal/service/entry_service_test.go` | 修改 | 覆盖历史 `file://` 图片导出恢复 |
| `backend/internal/service/sync_v2_service_test.go` | 修改 | 覆盖 `sync_v2` 自动建立媒体关联 |

---

## 非目标

- 不修改 nginx 配置
- 不修改前端图片查看器
- 不回填历史数据库中的 `entries.media` 原始 JSON
- 不处理媒体去重或多文件名碰撞之外的全量修复脚本

---

## 验收标准

满足以下条件即视为完成：

1. `sync_v2` 创建或更新带媒体 URL 的记录后，`media_files.entry_id` 被正确写入
2. 历史坏记录在导出时不再返回 `file://...jpg`
3. 导出结果改为标准 `/api/media/{id}`
4. 新增的后端回归测试全部通过

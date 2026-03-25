# 本地首轮上云照片媒体修复设计

**日期**: 2026-03-25
**状态**: 已批准
**阶段**: 云同步引导修复

## 目标

修复“启用云模式并选择上传本地数据”时，本地照片记录把 `file://` 路径直接同步到服务端的问题。

修复后：

1. 本地已有照片在首轮上云前会先上传媒体文件
2. 同步到服务端的 `media` JSON 至少带有可跨设备使用的 `remoteUri`
3. 其他设备从云端恢复该照片时，不会只拿到失效的本地缓存路径

本次不尝试自动修复历史上已经写入云端、且只保存了 `file://` 路径的坏数据，因为服务端没有这些图片的原始字节。

---

## 根因

当前“本地 -> 云端”首轮引导走的是：

1. `syncBootstrapService.runInitialFlow('local')` 把本地记录标记为 `pending`
2. `createCloudSyncService().syncNow()` 直接把本地 `entry.media` 序列化后发给服务端

对于离线创建的照片，这里的 `entry.media` 只有当前设备的本地文件路径，例如：

- `uri: file:///data/.../media/photos/display/...jpg`
- 没有 `remoteUri`

服务端把这份 JSON 原样保存后，其他设备恢复时拿到的仍然是本地 `file://` 路径，最终导致图片查看器加载失败。

---

## 方案选择

采用方案 A：只修客户端首轮上云前的媒体上传准备。

不采用后端兜底或重建远端 entry，原因是：

- 后端拿不到本地文件字节，无法把失效 `file://` 变成真实远端媒体
- 改成“重新创建云端记录”会打破现有 `entry.id` 和增量同步语义

最终策略：

1. `runInitialFlow('local')` 在把记录标为 `pending` 之前，扫描本地已有媒体记录
2. 对缺少 `remoteUri` 的照片和语音，先调用 `/media/upload`
3. 把上传得到的 URL 回填到本地 `media.remoteUri`
4. 再进入现有 `pending -> syncNow()` 流程，让服务端收到可跨设备恢复的媒体地址

---

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/src/services/syncBootstrapService.ts` | 修改 | 在 `runInitialFlow('local')` 中补媒体预上传与本地 `remoteUri` 回填 |
| `app/src/services/__tests__/syncBootstrapService.test.ts` | 修改 | 增加本地照片首轮上云的失败回归测试与通过断言 |
| `docs/superpowers/specs/2026-03-25-cloud-bootstrap-photo-media-design.md` | 新增 | 记录本次设计 |
| `docs/superpowers/plans/2026-03-25-cloud-bootstrap-photo-media.md` | 新增 | 记录本次执行计划 |

---

## 设计细节

### 一、只预上传缺失远端地址的媒体

对 `entry.media` 中满足以下条件的媒体执行上传：

- `uri` 是本地文件路径
- `remoteUri` 为空

如果媒体已经有 `remoteUri`，说明之前已经上传过，不重复上传。

### 二、保留本地 `uri`，只补 `remoteUri`

上传完成后，本地 entry 更新为：

- `uri` 保持本地路径不变，继续服务当前设备
- `remoteUri` 写入上传返回的 URL

这样既不影响当前设备的本地显示，也能保证 `syncNow()` 发给服务端的是可恢复媒体。

### 三、失败时中断启用云模式

如果媒体预上传失败：

- `runInitialFlow('local')` 直接抛错
- 外层已有 `finishEnableCloud()` 错误处理会阻止继续切换并提示失败

本次不做“部分成功继续同步”，避免把一半是远端地址、一半是本地路径的脏数据再次写到云端。

### 四、日志保持最小化

这次不新增广泛诊断日志，只复用现有错误抛出和上层提示。

需要时可以在后续单独补“首轮上云媒体预上传”日志，但不和这次行为修复捆绑。

---

## 验收标准

满足以下条件即可：

1. 本地存在仅含 `file://` 照片路径的记录时，执行 `runInitialFlow('local')` 会先上传媒体并把 `remoteUri` 回填到本地
2. 之后 `syncNow()` 发给服务端的 `media` JSON 包含远端地址
3. 已有带 `remoteUri` 的媒体不会重复上传
4. 相关 Jest 测试通过

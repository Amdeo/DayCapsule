# 工作区数据隔离与云端模式简化设计

**日期**：2026-04-04
**状态**：待实现

---

## 背景与目标

当前数据 scope key 仅含服务器 URL（`env_{server}`），同一服务器不同账号的数据共用同一份本地存储（SQLite、MMKV、文件目录），存在数据污染隐患。

同时，云端模式切换流程要求用户选择数据方向（"云端→本地"或"本地→云端"），概念复杂，容易出错（历史上也出现过 `'switching'` 状态永久卡住的 bug）。

**目标**：
1. 将 accountId 加入数据 scope，实现同服务器不同账号的完全隔离
2. 简化云端模式切换：云端永远是 source of truth，无需用户选方向
3. "工作区"是内部概念，用户界面不暴露该词，只感知"账号"和"云端开关"

---

## 架构设计

### Scope Key 分层

| 数据类型 | Scope Key | 原因 |
|---------|-----------|------|
| Auth（token、user）| `env_{server}` | 登录前无法知道 userId |
| 其他所有数据 | `env_{server}_{userId}` | 保证账号间隔离 |
| 未登录/纯本地 | `'local'` | 统一处理无用户场景 |

**受影响的数据层**：
- MMKV：settingsStore（7 个 key）、syncStore
- SQLite：DB 文件名
- 文件系统：media 目录、DB 目录

### 新增：`workspaceService.ts`

统一计算当前数据 scope key，所有需要 scope 的地方调用此服务，不再各自计算。

```typescript
// app/src/services/workspaceService.ts

// 同步版本（供 sqlite.ts、fileSystem.ts 使用）
export function getCurrentDataScopeKeySync(): string

// 异步版本（供 settingsStore、syncStore 使用）
export async function getCurrentDataScopeKey(): Promise<string>

// 工具函数
export function buildDataScopeKey(serverUrl: string, userId: string): string
// 返回 `env_{server}_{userId}`，server 部分沿用现有 getServerKey() 逻辑
```

**规则**：
- 已登录 → `env_{server}_{userId}`
- 未登录 → `'local'`（不抛错，允许离线使用）

---

## Bootstrap 顺序调整

必须在打开数据库之前知道 userId，因此调整启动顺序：

```
改前：initDatabase → migrations → loadAuth → loadSettings
改后：loadAuth → [migration] → initDatabase → migrations → loadSettings
```

新顺序中 `loadAuth()` 最先执行，此后 `workspaceService` 能正确返回 userId-scoped key。

---

## 数据迁移（一次性，对用户透明）

在 `loadAuth()` 之后、`initDatabase()` 之前执行，检测并迁移旧格式数据：

**触发条件**（同时满足）：
1. 用户已登录（有 userId）
2. 新 scope DB 文件不存在
3. 旧 scope DB 文件存在

**迁移步骤**（顺序执行，任一失败则跳过后续但不崩溃）：

```
1. 重命名 SQLite DB 文件
   MemoryCapsule-env_{server}.db → MemoryCapsule-env_{server}_{userId}.db

2. 复制 MMKV keys（共 9 个已知 key）
   env_{server}:settings:{7个key} → env_{server}_{userId}:settings:{7个key}
   env_{server}:sync:{lastSyncAt, cursor} → env_{server}_{userId}:sync:{...}

3. 重命名文件系统目录
   environments/env_{server}/ → environments/env_{server}_{userId}/

4. 删除旧 MMKV keys（DB 和目录已重命名，旧 key 无用）
```

**降级**：迁移失败时，以空工作区启动（旧数据留在原位，不丢失）。
**幂等**：以新 scope DB 是否存在作为"已迁移"标志，重启不重复执行。

---

## 云端模式切换简化

### 开启云端模式

```
改前：检查数据量 → 弹对话框（云端→本地 / 本地→云端）
改后：
  云端有数据 → runInitialFlow('cloud')：下载云端数据替换本地
  云端为空   → 直接 setCloudMode(true)，后续新增内容正常同步
  全程无方向选择对话框
```

`syncBootstrapService` 的 `needs-decision` 分支（两边都有数据）改为直接走 `'cloud'` 方向，不再返回需要用户决策的状态。

### 关闭云端模式

```
改前：弹对话框（云端→本地 / 本地→云端 / 取消）
改后：
  简单确认弹窗："切换到离线模式，本地数据将保留，是否继续？"
  确认 → setCloudMode(false)，本地缓存保留
  取消 → 维持云端模式
```

不再发起 `/entries/count` API 请求，不再要求用户决策数据方向。

---

## 受影响文件

| 文件 | 变更类型 |
|------|---------|
| `app/src/services/workspaceService.ts` | 新增 |
| `app/src/services/appBootstrapService.ts` | 调整 bootstrap 顺序 + 加迁移逻辑 |
| `app/src/store/settingsStore.ts` | `getScopedSettingsKey` 改用 `workspaceService` |
| `app/src/store/syncStore.ts` | `getScopedSyncKey` 改用 `workspaceService` |
| `app/src/database/sqlite.ts` | `getDatabaseName` 改用 `workspaceService` |
| `app/src/utils/fileSystem.ts` | `getCurrentServerScope` 改用 `workspaceService` |
| `app/src/components/settings-page/useSettingsPageDisableCloudMode.ts` | 重写（简化） |
| `app/src/components/settings-page/useSettingsPageCloudMode.ts` | 简化 enableCloud 分支 |
| `app/src/services/syncBootstrapService.ts` | needs-decision 改为默认 cloud |

Auth 相关（`authStore.ts`、`apiClient.ts`、`mediaCacheService.ts`）**不变**，继续用 `env_{server}` scope。

---

## 验证

| 场景 | 预期结果 |
|------|---------|
| 老用户首次升级，已登录 | 数据自动迁移到新 scope，无感 |
| 老用户首次升级，未登录 | 以本地模式启动，数据保留在旧位置 |
| 同一服务器 A 账号登录 | 使用 `env_{server}_{userId_A}` 数据 |
| 同服务器切换到 B 账号 | 使用 `env_{server}_{userId_B}` 数据，与 A 完全隔离 |
| 开启云端模式（云端有数据）| 下载云端数据，无对话框 |
| 开启云端模式（云端为空）| 直接连接，本地数据保留，无对话框 |
| 关闭云端模式 | 简单确认，本地缓存保留 |
| 迁移失败 | 以空工作区启动，不崩溃，旧数据不丢失 |

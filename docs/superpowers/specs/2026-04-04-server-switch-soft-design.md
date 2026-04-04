# 服务器切换软切换设计

**日期：** 2026-04-04
**状态：** 已批准

---

## 背景

用户在设置页切换服务器 URL 时，现有流程会调用 `resetDatabase()` 清空本地 SQLite 数据库，导致：

- 切换后主页无任何数据，用户登录后还需等待全量同步
- 即使曾在该服务器登录过，历史缓存也已丢失

用户期望的体验：切换服务器只是切换连接目标，不破坏本地缓存；登录后直接显示缓存并在后台增量同步。

---

## 目标

1. 切换服务器时**不清空**本地数据库
2. 切换后如有历史缓存，主页直接显示
3. 登录后后台增量同步，云端数据优先（现有逻辑已支持）
4. 改动范围最小，风险最低

---

## 现有机制说明

### dataScopeKey

数据库文件名由 `dataScopeKey` 决定：

```
dataScopeKey = serverKey + "_" + userId  （已登录）
dataScopeKey = "local"                   （未登录）
```

对应数据库文件：`MemoryCapsule-{dataScopeKey}.db`

每个服务器 + 用户组合天然对应独立的 db 文件，**物理上已经隔离**，无需手动 reset。

### 切换流程（改动前）

```
保存URL → resetApiClient() → resetDatabase() → initDatabase() → reloadState()
```

`resetDatabase()` 关闭并删除当前 db 连接，`initDatabase()` 新建，导致缓存丢失。

---

## 方案：移除 resetDatabase()

### 切换流程（改动后）

```
保存URL → resetApiClient() → initDatabase(复用或新建) → reloadState()
```

`initDatabase()` 内部已有幂等判断：若 db 名未变则复用，若变则新建。去掉 `resetDatabase()` 后，切换服务器时旧 db 文件保留在磁盘，切回时自动复用。

### 各场景行为

| 场景 | 行为 |
|------|------|
| 切换到从未登录过的服务器 | API client 重置 → 新建空 db → `reloadState` 中 `loadAuth` 拿不到 token → `isAuthenticated=false` → 主页空白 → 用户手动登录 → 增量同步 |
| 切换回曾登录过的服务器 | API client 重置 → 复用旧 db → `loadAuth` 找到旧 token → token 有效则直接显示缓存并后台同步；token 失效则显示缓存但 UI 提示需重新登录 |
| 当前有登录态时切换服务器 | 旧账号 token 不动，新服务器 `loadAuth` 拿不到 token → `isAuthenticated=false` → 登录页，缓存（旧 db）不受影响 |

### 云端优先

登录后同步逻辑不变：

- 现有 `cloudSyncService` 使用游标增量同步
- 冲突时 `applyConflictWinner` 以云端为主
- 本地比云端少 → 补充；本地比云端多 → 云端胜出

---

## 改动范围

**仅修改一个文件：**

`app/src/services/localEnvironmentDataManager.ts`

- 删除 `initializeEnvironmentRuntime` 中的 `resetDatabase()` 调用
- 删除顶部 `resetDatabase` 的 import

---

## 风险评估

| 风险 | 说明 | 缓解 |
|------|------|------|
| 旧 db 文件积累占用磁盘 | 每个服务器+用户一个 db 文件 | 当前用户量小，可接受；后续可加清理入口 |
| token 失效后旧缓存可见 | 用户看到过期数据 | UI 已有未登录态提示，体验可接受 |
| migration 在旧 db 上重复执行 | `IF NOT EXISTS` 保证幂等 | 现有 migration 已幂等，无风险 |

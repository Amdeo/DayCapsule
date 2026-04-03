# 账号切换重启 Bootstrap + WorkspaceService 去 Store 依赖 设计

**日期**：2026-04-04
**状态**：待实现

---

## 背景与目标

上一轮改造（workspace scope 隔离）引入了两个遗留问题：

1. **workspaceService 依赖 authStore**：`getCurrentDataScopeKeySync()` 直接调用 `useAuthStore.getState()`，违反项目规范（service 不直接调用 store），且在 store 初始化之前调用时会拿到错误的 scope
2. **账号切换不重启 DB**：登出再登入不同账号时，`getDatabaseName()` 会返回新 scope，但 App 状态（entryStore、syncStore 等内存数据）不会重置，旧账号数据残留

**目标**：
1. workspaceService 从 MMKV 直接读 userId，彻底去掉 store 依赖
2. 登出时触发完整 bootstrap 重跑，所有 store 内存状态重置，DB 切换到新 scope

---

## 架构设计

### 1. MMKV userId 持久化

`authStore` 在 `login()` / `loadAuth()` 成功后，将 userId 写入 MMKV：

```
key: env_{server}:workspace:currentUserId
value: userId (string)
```

登出时清空该 key。

这个 key 使用 server-level scope（`env_{server}`），与 auth token 的 scope 保持一致，确保不同服务器账号互不干扰。

### 2. workspaceService 去 store 依赖

`workspaceService` 不再导入 `useAuthStore`，改为直接从 MMKV 读取：

```typescript
// 伪代码
export function getCurrentDataScopeKeySync(): string {
  const serverUrl = getCurrentServerUrlSync();
  if (!serverUrl) return LOCAL_SCOPE;
  const userIdKey = withScope(getServerKey(serverUrl), 'workspace:currentUserId');
  const userId = Storage.getStringSync(userIdKey);
  if (!userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}
```

异步版本类似，使用 `getCurrentServerUrl()`（async）+ `Storage.getString()`。

**效果**：workspaceService 只依赖 `backendEnvironmentService` 和 `storage`，无 store 依赖，可在任意时序调用。

### 3. appLifecycleStore — 重启信号

新建极简 store `appLifecycleStore.ts`：

```typescript
interface AppLifecycleState {
  needsRestart: boolean;
  triggerRestart: () => void;
  clearRestart: () => void;
}
```

`authStore.logout()` 调用 `triggerRestart()`，根组件监听 `needsRestart`，为 true 时展示 loading 画面并重跑 `runAppBootstrap()`，完成后调用 `clearRestart()`。

### 4. 完整登出流程

```
用户点击登出
  → authStore.logout()
      1. 清空内存状态（user/token/isAuthenticated → null/false）
      2. 清空 MMKV auth token keys
      3. 清空 MMKV workspace:currentUserId key
      4. appLifecycleStore.triggerRestart()

  → 根组件检测到 needsRestart = true
      1. 展示 loading 画面（隐藏主界面）
      2. 重置所有 store 内存状态（entryStore、syncStore、settingsStore）
      3. 调用 runAppBootstrap()
      4. bootstrap 完成 → clearRestart() → 展示主界面（此时未登录，显示登录页）
```

### 5. 登入新账号后的 DB 切换

新账号登入后 `login()` 写入新的 userId 到 MMKV，此时 `getDatabaseName()` 返回新 scope 的 DB 文件名。由于 bootstrap 已经重跑，`initDatabase()` 会以新文件名打开 DB，自动切换。无需额外处理。

---

## 受影响文件

| 文件 | 操作 | 改动 |
|------|------|------|
| `app/src/store/appLifecycleStore.ts` | 新建 | needsRestart 信号 store |
| `app/src/store/authStore.ts` | 修改 | login/loadAuth 写 userId 到 MMKV；logout 清空 userId key + triggerRestart |
| `app/src/services/workspaceService.ts` | 修改 | 删除 useAuthStore 依赖，改从 MMKV 读 userId |
| `app/src/app/_layout.tsx`（或根组件） | 修改 | 监听 needsRestart，触发时重跑 bootstrap |
| `app/src/store/__tests__/authStore.test.ts` | 修改 | 新增 userId MMKV 写入和 triggerRestart 的测试 |
| `app/src/services/__tests__/workspaceService.test.ts` | 新建 | workspaceService 单元测试 |

Auth 相关（token、refreshToken）scope 不变，继续用 `env_{server}`。

---

## 验证

| 场景 | 预期结果 |
|------|---------|
| 账号 A 登录，登出，账号 B 登录 | B 看不到 A 的数据，DB 文件名不同 |
| 登出后重启 App | 显示登录页，无旧账号数据残留 |
| workspaceService 在 store 初始化前调用 | 从 MMKV 直接读取，返回正确 scope |
| 未登录时调用 workspaceService | 返回 `'local'`，不崩溃 |
| 登出时 bootstrap 重跑失败 | 显示错误提示，不卡死 |

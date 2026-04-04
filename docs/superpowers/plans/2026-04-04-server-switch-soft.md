# 服务器切换软切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 切换服务器时不清空本地数据库，保留缓存，让用户登录后直接看到历史数据并增量同步。

**Architecture:** 从 `initializeEnvironmentRuntime` 中移除 `resetDatabase()` 调用。`initDatabase()` 本身已有幂等逻辑（db 名不变则复用，变则新建），去掉 reset 后切换服务器时旧 db 文件保留在磁盘，切回时自动复用。数据库文件已按 `serverKey_userId` 隔离，无需额外改动。

**Tech Stack:** TypeScript、Jest、expo-sqlite、Zustand

---

## 文件改动范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/services/localEnvironmentDataManager.ts` | 修改 | 删除 `resetDatabase()` 调用和对应 import |
| `app/src/services/__tests__/localEnvironmentDataManager.test.ts` | 修改 | 更新测试：去掉 `resetDatabase` mock 断言，新增"不调用 resetDatabase"断言 |

---

## Task 1: 更新测试，期待不调用 resetDatabase

**Files:**
- Modify: `app/src/services/__tests__/localEnvironmentDataManager.test.ts`

- [ ] **Step 1: 修改测试文件**

在 `app/src/services/__tests__/localEnvironmentDataManager.test.ts` 中做以下改动：

1. 删除第 14 行的 `mockResetDatabase` 声明：
```typescript
// 删除这行：
const mockResetDatabase = jest.fn();
```

2. 修改第 16-19 行的 sqlite mock，移除 `resetDatabase`：
```typescript
jest.mock('@/src/database/sqlite', () => ({
  initDatabase: () => mockInitDatabase(),
}));
```

3. 在 `it('switches runtime dependencies...')` 测试中，删除第 101-104 行对 `mockResetDatabase` 的断言，并新增一个断言确认 `resetDatabase` 不被调用。由于 mock 里已没有 `resetDatabase`，只需删除相关断言行：

删除：
```typescript
expect(mockResetDatabase).toHaveBeenCalledTimes(1);
expect(mockInvalidateActiveQueries.mock.invocationCallOrder[0]).toBeLessThan(
  mockResetDatabase.mock.invocationCallOrder[0]
);
```

完整修改后的第一个测试（`switches runtime dependencies...`）应如下：
```typescript
it('switches runtime dependencies and reloads environment state', async () => {
  await switchBackendEnvironment('https://server-b.example.com/');

  expect(setCurrentServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
  expect(rememberServerUrl).toHaveBeenCalledWith('https://server-b.example.com');
  expect(mockInvalidateActiveQueries).toHaveBeenCalledTimes(1);
  expect(mockResetApiClient).toHaveBeenCalledTimes(1);
  expect(mockInitDatabase).toHaveBeenCalledTimes(1);
  expect(mockMigrateToMediaJson).toHaveBeenCalledTimes(1);
  expect(mockMigrateEntriesContentToFts).toHaveBeenCalledTimes(1);
  expect(mockMigrateLocalReadyStateColumn).toHaveBeenCalledTimes(1);
  expect(mockMigrateSyncStatusColumn).toHaveBeenCalledTimes(1);
  expect(mockMigrateCloudSyncCoreColumns).toHaveBeenCalledTimes(1);
  expect(mockEnsureDirectories).toHaveBeenCalledTimes(1);
  expect(mockMigrateToMediaJson.mock.invocationCallOrder[0]).toBeLessThan(
    mockMigrateEntriesContentToFts.mock.invocationCallOrder[0]
  );
  expect(mockMigrateEntriesContentToFts.mock.invocationCallOrder[0]).toBeLessThan(
    mockMigrateLocalReadyStateColumn.mock.invocationCallOrder[0]
  );
  expect(mockMigrateLocalReadyStateColumn.mock.invocationCallOrder[0]).toBeLessThan(
    mockMigrateSyncStatusColumn.mock.invocationCallOrder[0]
  );
  expect(mockMigrateSyncStatusColumn.mock.invocationCallOrder[0]).toBeLessThan(
    mockMigrateCloudSyncCoreColumns.mock.invocationCallOrder[0]
  );
  expect(mockMigrateCloudSyncCoreColumns.mock.invocationCallOrder[0]).toBeLessThan(
    mockEnsureDirectories.mock.invocationCallOrder[0]
  );
  expect(mockAuthLoadAuth).toHaveBeenCalledTimes(1);
  expect(mockSettingsLoad).toHaveBeenCalledTimes(1);
  expect(mockSyncLoad).toHaveBeenCalledTimes(1);
  expect(mockEntryLoad).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest --testPathPattern="localEnvironmentDataManager" --no-coverage
```

期望：**FAIL** — 因为实现代码还在调用 `resetDatabase`，但 mock 里已没有该函数，会报错或断言失败。

- [ ] **Step 3: Commit 测试**

```bash
git add app/src/services/__tests__/localEnvironmentDataManager.test.ts
git commit -m "test(localEnvironmentDataManager): 更新测试期待不调用 resetDatabase"
```

---

## Task 2: 修改实现，移除 resetDatabase 调用

**Files:**
- Modify: `app/src/services/localEnvironmentDataManager.ts`

- [ ] **Step 1: 修改实现文件**

在 `app/src/services/localEnvironmentDataManager.ts` 中做以下改动：

1. 删除第 9 行 import 中的 `resetDatabase`：
```typescript
// 修改前：
import { initDatabase, resetDatabase } from '@/src/database/sqlite';

// 修改后：
import { initDatabase } from '@/src/database/sqlite';
```

2. 删除 `initializeEnvironmentRuntime` 函数中第 40 行的 `resetDatabase()` 调用：
```typescript
// 修改前：
const initializeEnvironmentRuntime = async (): Promise<void> => {
  resetApiClient();
  useEntryStore.getState().invalidateActiveQueries();
  resetDatabase();          // ← 删除这行
  const databaseReady = await initDatabase();
  // ...
};

// 修改后：
const initializeEnvironmentRuntime = async (): Promise<void> => {
  resetApiClient();
  useEntryStore.getState().invalidateActiveQueries();
  const databaseReady = await initDatabase();
  if (!databaseReady) {
    throw new Error('初始化数据库失败');
  }
  await migrateToMediaJson();
  await migrateEntriesContentToFts();
  await migrateLocalReadyStateColumn();
  await migrateSyncStatusColumn();
  await migrateCloudSyncCoreColumns();
  await ensureDirectories();
};
```

- [ ] **Step 2: 运行测试，确认通过**

```bash
cd app && npx jest --testPathPattern="localEnvironmentDataManager" --no-coverage
```

期望：**PASS** — 所有 4 个测试通过。

- [ ] **Step 3: 运行全量测试，确认无回归**

```bash
cd app && npx jest --no-coverage
```

期望：全部通过（或与改动前相同数量的失败，无新增失败）。

- [ ] **Step 4: Commit 实现**

```bash
git add app/src/services/localEnvironmentDataManager.ts
git commit -m "feat(localEnvironmentDataManager): 切换服务器时保留本地缓存，移除 resetDatabase 调用"
```

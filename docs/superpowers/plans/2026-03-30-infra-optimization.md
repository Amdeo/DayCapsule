# Infra Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有业务行为的前提下，拆分根布局中的启动编排逻辑，移除确认未使用的依赖，并让 README 与当前工程状态一致。

**Architecture:** 保留 `app/app/_layout.tsx` 作为 Expo Router 根入口，把一次性启动逻辑和生命周期恢复逻辑下沉到独立 service 模块。依赖清理只处理已确认未引用的包，README 只修正已经验证失真的描述，不顺手扩大范围。

**Tech Stack:** Expo Router, React Native, TypeScript, Zustand, Expo Network, Expo Splash Screen, npm

---

## File Structure

- Modify: `app/app/_layout.tsx`
  - 保留根组件、Sentry 初始化、字体加载和 UI 壳层。
  - 改为调用拆分后的 bootstrap / lifecycle 函数。
- Create: `app/src/services/appBootstrapService.ts`
  - 封装一次性启动编排：文件系统、音频、数据库、迁移、认证恢复、云模式恢复、上传补偿、顶部同步状态刷新。
- Create: `app/src/services/appLifecycleService.ts`
  - 封装前后台切换与网络恢复逻辑：自动备份、回前台恢复、网络恢复触发补偿。
- Modify: `app/package.json`
  - 删除未使用依赖 `@tanstack/react-query`。
- Modify: `app/pnpm-lock.yaml`
  - 同步 lockfile。
- Modify: `README.md`
  - 修正与当前工程状态不一致的表述。

### Task 1: 拆分启动编排服务

**Files:**
- Create: `app/src/services/appBootstrapService.ts`
- Modify: `app/app/_layout.tsx`
- Test: `app/app/_layout.tsx`

- [ ] **Step 1: 先为拆分目标建立代码边界草稿**

在 `app/src/services/appBootstrapService.ts` 中创建最小导出接口，先只声明类型和函数骨架：

```ts
import { logger } from '@/src/utils/logger';

export interface AppBootstrapDependencies {
  refreshCloudSyncIndicator: (label: string) => Promise<void>;
  onInitializationFailed: () => void;
}

export async function runAppBootstrap(
  deps: AppBootstrapDependencies
): Promise<void> {
  logger.log('[appBootstrap] bootstrap placeholder');
  void deps;
}
```

- [ ] **Step 2: 运行类型检查确认新文件接入前仍然通过**

Run: `pnpm run typecheck`

Expected: PASS

- [ ] **Step 3: 把 `_layout.tsx` 中的一次性启动逻辑搬入 service**

把以下逻辑从 `app/app/_layout.tsx` 迁移到 `runAppBootstrap()` 中，保持顺序和条件不变：

- `initializeFileSystem()`
- `VoiceService.initializeAudio()`
- `initDatabase()`
- `migrateFromAsyncStorage()`
- `migrateTagsToNormalized()`
- `migrateMediaMetadataColumns()`
- `migrateToMediaJson()`
- `migrateSyncStatusColumn()`
- `migrateCloudSyncCoreColumns()`
- `migrateLocalReadyStateColumn()`
- `cleanupIncompleteLocalEntries()`
- `useAuthStore.getState().loadAuth()`
- `useSyncStore.getState().load()`
- cloudMode 恢复逻辑
- `flushPendingVoiceUploads()`
- `flushPendingPhotoUploads()`
- `deps.refreshCloudSyncIndicator('启动后')`

目标代码结构如下：

```ts
export async function runAppBootstrap(
  deps: AppBootstrapDependencies
): Promise<void> {
  try {
    await Promise.all([
      initializeFileSystem().then(() => logger.log('✅ 文件系统初始化成功')),
      VoiceService.initializeAudio().then(() => logger.log('✅ 音频系统初始化成功')),
    ]);

    const dbSuccess = await initDatabase();
    if (!dbSuccess) {
      throw new Error('数据库初始化失败');
    }

    const migrationResult = await migrateFromAsyncStorage();
    if (migrationResult.success) {
      logger.log(`✅ 数据迁移完成，迁移了 ${migrationResult.migratedCount} 条记录`);
    } else {
      logger.warn('⚠️ 数据迁移警告:', migrationResult.error);
      Alert.alert('数据迁移警告', '部分数据可能未正确导入，但应用可以正常使用');
    }

    await migrateTagsToNormalized();
    await migrateMediaMetadataColumns();
    await migrateToMediaJson();
    await migrateSyncStatusColumn();
    await migrateCloudSyncCoreColumns();
    await migrateLocalReadyStateColumn();

    await cleanupIncompleteLocalEntries().catch((cleanupError) => {
      logger.warn('⚠️ 启动时清理未完成本地 entry 失败:', cleanupError);
    });

    await useAuthStore.getState().loadAuth();
    await useSyncStore.getState().load();

    // 保留现有 cloudMode 恢复逻辑

    await flushPendingVoiceUploads().catch((queueError) => {
      logger.warn('⚠️ 启动时补传待上传语音失败:', queueError);
    });
    await flushPendingPhotoUploads().catch((queueError) => {
      logger.warn('⚠️ 启动时补传待上传照片失败:', queueError);
    });

    await deps.refreshCloudSyncIndicator('启动后');
  } catch (error) {
    logger.error('❌ 应用初始化失败:', error);
    deps.onInitializationFailed();
  }
}
```

- [ ] **Step 4: 让 `_layout.tsx` 只调用 bootstrap service**

将当前初始化 `useEffect` 改成最小调用层，保留错误反馈逻辑在调用点组装：

```ts
useEffect(() => {
  void runAppBootstrap({
    refreshCloudSyncIndicator,
    onInitializationFailed: () => {
      showErrorFeedback(buildAppInitializationFailedFeedback());
    },
  });
}, []);
```

- [ ] **Step 5: 运行类型检查验证启动编排拆分**

Run: `pnpm run typecheck`

Expected: PASS

### Task 2: 拆分生命周期恢复逻辑

**Files:**
- Create: `app/src/services/appLifecycleService.ts`
- Modify: `app/app/_layout.tsx`
- Test: `app/app/_layout.tsx`

- [ ] **Step 1: 先创建生命周期 service 骨架**

在 `app/src/services/appLifecycleService.ts` 中添加最小可调用接口：

```ts
import type { AppStateStatus } from 'react-native';

export interface CloudRecoveryDependencies {
  refreshCloudSyncIndicator: (label: string) => Promise<void>;
}

export function createCloudRecoveryRunner(
  deps: CloudRecoveryDependencies
): (label: string) => Promise<void> {
  let pendingRecovery: Promise<void> | null = null;

  return async (label: string) => {
    void deps;
    void label;
    if (pendingRecovery) {
      return pendingRecovery;
    }
    pendingRecovery = Promise.resolve().finally(() => {
      pendingRecovery = null;
    });
    return pendingRecovery;
  };
}

export async function handleAppStateChange(
  previousState: AppStateStatus,
  nextState: AppStateStatus,
  runRecovery: (label: string) => Promise<void>
): Promise<void> {
  void previousState;
  void nextState;
  void runRecovery;
}
```

- [ ] **Step 2: 运行类型检查确认骨架无误**

Run: `pnpm run typecheck`

Expected: PASS

- [ ] **Step 3: 把回前台/网络恢复/自动备份逻辑迁入 service**

在 `app/src/services/appLifecycleService.ts` 中实现：

- `createCloudRecoveryRunner()`
  - 保留当前“同一时刻只跑一个恢复任务”的 Promise 锁。
  - 保留 `createCloudSyncService().syncNow()`、`flushPendingVoiceUploads()`、`flushPendingPhotoUploads()`、`refreshCloudSyncIndicator()` 调用顺序。
- `handleAppStateChange()`
  - 后台时执行 `BackupService.shouldBackup()` 和 `BackupService.createBackup()`。
  - 回到前台时执行 `runRecovery('回到前台时')`。

目标实现片段：

```ts
export function createCloudRecoveryRunner(
  deps: CloudRecoveryDependencies
): (label: string) => Promise<void> {
  let pendingRecovery: Promise<void> | null = null;

  return async (label: string) => {
    if (pendingRecovery) {
      return pendingRecovery;
    }

    pendingRecovery = (async () => {
      if (useAuthStore.getState().isAuthenticated && useSettingsStore.getState().cloudMode === true) {
        await createCloudSyncService().syncNow().catch((syncError) =>
          logger.warn(`⚠️ ${label}entry 云同步失败:`, syncError)
        );
      }

      await flushPendingVoiceUploads().catch((queueError) =>
        logger.warn(`⚠️ ${label}补传待上传语音失败:`, queueError)
      );
      await flushPendingPhotoUploads().catch((queueError) =>
        logger.warn(`⚠️ ${label}补传待上传照片失败:`, queueError)
      );
      await deps.refreshCloudSyncIndicator(`${label}后`);
    })().finally(() => {
      pendingRecovery = null;
    });

    return pendingRecovery;
  };
}
```

- [ ] **Step 4: 精简 `_layout.tsx` 中的生命周期副作用**

让 `_layout.tsx` 只保留：

- `appStateRef`
- `wasNetworkReachableRef`
- 调用 `createCloudRecoveryRunner()` 生成 `runPendingCloudRecovery`
- 在 `AppState.addEventListener()` 中调用 `handleAppStateChange()`
- 在网络恢复监听中调用 `runPendingCloudRecovery('网络恢复时')`

目标代码片段：

```ts
const runPendingCloudRecovery = useRef(
  createCloudRecoveryRunner({ refreshCloudSyncIndicator })
).current;

useEffect(() => {
  const subscription = AppState.addEventListener('change', async (nextState) => {
    const prev = appStateRef.current;
    appStateRef.current = nextState;
    await handleAppStateChange(prev, nextState, runPendingCloudRecovery);
  });

  return () => subscription.remove();
}, [runPendingCloudRecovery]);
```

- [ ] **Step 5: 运行类型检查验证生命周期拆分**

Run: `pnpm run typecheck`

Expected: PASS

### Task 3: 清理未使用依赖

**Files:**
- Modify: `app/package.json`
- Modify: `app/pnpm-lock.yaml`
- Test: `app/package.json`

- [ ] **Step 1: 再次确认 `@tanstack/react-query` 没有代码引用**

Run: `rg "@tanstack/react-query|QueryClient|useQuery|useMutation" "."`

Expected: no matches in application source

- [ ] **Step 2: 从 `package.json` 删除依赖项**

把这行从 `dependencies` 中删除：

```json
"@tanstack/react-query": "^5.90.17",
```

- [ ] **Step 3: 更新 lockfile**

Run: `pnpm install`

Expected: package-lock updated, dependency removed

- [ ] **Step 4: 运行类型检查确认删依赖后未破坏构建**

Run: `pnpm run typecheck`

Expected: PASS

### Task 4: 修正文档失真

**Files:**
- Modify: `README.md`
- Test: `README.md`

- [ ] **Step 1: 找出 README 中与当前状态冲突的表述**

重点检查以下几类文案：

- “零 tsc 错误”
- “避免 StyleSheet” 这类已被现状打破的绝对表述
- 默认暗示所有检查均通过的描述

Run: `rg "零 tsc 错误|StyleSheet|全部通过|当前仓库" README.md`

Expected: returns the lines that need editing

- [ ] **Step 2: 将 README 改成描述真实状态，而非理想状态**

把类似下面的绝对表述：

```md
- ✅ **TypeScript 严格模式** - 零 tsc 错误
- ✅ **自动化测试** - 当前仓库 `pnpm test` 可运行（65 个用例）
- **样式规范** - 使用 NativeWind `className`，避免 `StyleSheet`
```

改成更准确的版本，例如：

```md
- ✅ **TypeScript 严格模式** - 以 `pnpm run typecheck` 作为静态类型检查基线
- ✅ **自动化测试** - 提供按场景拆分的 Jest 命令与 Maestro 冒烟脚本
- **样式规范** - 新增样式默认使用 NativeWind `className`，部分旧样式仍在迁移中
```

如果当前测试数或通过数没有最新证据，不要继续写具体数字。

- [ ] **Step 3: 复查 README 只修正本轮已验证问题**

人工检查：不要顺手扩写其他未验证内容，不新增新的承诺性描述。

- [ ] **Step 4: 运行类型检查作为本轮最终代码验证的一部分**

Run: `pnpm run typecheck`

Expected: PASS

### Task 5: 最终验证与结果记录

**Files:**
- Modify: `app/app/_layout.tsx`
- Modify: `app/src/services/appBootstrapService.ts`
- Modify: `app/src/services/appLifecycleService.ts`
- Modify: `app/package.json`
- Modify: `app/pnpm-lock.yaml`
- Modify: `README.md`

- [ ] **Step 1: 运行类型检查**

Run: `pnpm run typecheck`

Expected: PASS

- [ ] **Step 2: 运行 lint 并确认没有新增失败**

Run: `pnpm run lint`

Expected: only the pre-existing 4 style migration errors remain, with no new lint failures

- [ ] **Step 3: 查看最终 diff，确认范围没有扩散**

Run: `git diff -- app/app/_layout.tsx app/src/services/appBootstrapService.ts app/src/services/appLifecycleService.ts app/package.json app/pnpm-lock.yaml README.md`

Expected: diff only covers bootstrap split, lifecycle split, dependency removal, and README updates

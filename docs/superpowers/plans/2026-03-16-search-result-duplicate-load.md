# 搜索结果重复加载修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复搜索/筛选后返回首页时的偶发双份列表问题，通过在 `entryStore` 中增加查询会话隔离和分页幂等追加，保证旧请求不会污染当前列表。

**Architecture:** 本次实现只改 Zustand store 与其单元测试，不改 UI 组件或数据库查询层。`entryStore` 会新增稳定的查询签名、统一的首屏查询入口、分页去重 helper，以及对过期首屏/分页/重试请求的回写保护；测试层用 deferred promise 和 fake timers 覆盖竞态路径。

**Tech Stack:** React Native, TypeScript, Zustand, Jest

---

## Chunk 1: `entryStore` 查询会话隔离与分页幂等

### Task 1: 先补竞态与重复追加测试，再让实现有明确护栏

**Files:**
- Modify: `app/src/store/__tests__/entryStore.test.ts`
- Reference: `app/src/store/entryStore.ts`

- [ ] **Step 1: 在测试文件里补可控异步工具和更完整的 reset**

在 `app/src/store/__tests__/entryStore.test.ts` 顶部常量区后加入可控 promise helper，并把 `resetStore()` 补齐新增字段的默认值：

```ts
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const resetStore = () =>
  useEntryStore.setState({
    entries: [],
    filteredEntries: [],
    isLoading: false,
    isLoadingMore: false,
    cursor: null,
    hasMore: true,
    searchQuery: '',
    filterType: 'all',
    filterDateRange: 'all',
    selectedTags: [],
    loadRetryCount: 0,
    currentPlayingId: null,
  });
```

说明：这一步先不要在测试里引用 `activeQueryKey`，否则会在红灯阶段变成 TypeScript 编译错误而不是断言失败。等 Task 2 Step 3 为 store 增加该字段后，再把 `resetStore()` 补成包含 `activeQueryKey: ''` 的最终版本。

- [ ] **Step 2: 先写 6 个失败测试，覆盖 spec 里的关键竞态**

在 `describe('loadEntries', ...)` 和 `describe('loadMore', ...)` 下追加这些用例，先不要实现：

```ts
it('旧的首屏请求晚返回时不应覆盖新的筛选结果', async () => {
  const first = createDeferred<any[]>();
  const second = createDeferred<any[]>();

  (DB.getEntriesPage as jest.Mock)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);

  useEntryStore.getState().setSearchQuery('first');
  const firstLoad = useEntryStore.getState().applyFilters();

  useEntryStore.getState().setSearchQuery('second');
  const secondLoad = useEntryStore.getState().applyFilters();

  second.resolve([{ id: 'new', type: 'text', content: 'new', timestamp: 2, syncStatus: 'synced' }]);
  await secondLoad;

  first.resolve([{ id: 'old', type: 'text', content: 'old', timestamp: 1, syncStatus: 'synced' }]);
  await firstLoad;

  expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['new']);
});

it('applySearchFilters 开启新查询时应重置遗留的 isLoadingMore', async () => {
  useEntryStore.setState({ isLoadingMore: true });
  (DB.getEntriesPage as jest.Mock).mockResolvedValue([
    { id: '1', type: 'text', content: 'hit', timestamp: 10, syncStatus: 'synced' },
  ]);

  await useEntryStore.getState().applySearchFilters({
    query: 'hit',
    type: 'text',
    dateRange: 'today',
    tags: ['b', 'a'],
  });

  expect(useEntryStore.getState().searchQuery).toBe('hit');
  expect(useEntryStore.getState().isLoadingMore).toBe(false);
  expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['1']);
});

it('重复返回同一分页结果时只保留一份 id', async () => {
  const existing = [
    { id: '1', type: 'text' as const, content: '第一页', timestamp: 2000, syncStatus: 'synced' as const },
  ];
  const duplicatePage = [
    { id: '1', type: 'text' as const, content: '第一页', timestamp: 2000, syncStatus: 'synced' as const },
    { id: '2', type: 'text' as const, content: '第二页', timestamp: 1000, syncStatus: 'synced' as const },
  ];

  useEntryStore.setState({ entries: existing, filteredEntries: existing, cursor: 2000, hasMore: true });
  (DB.getEntriesPage as jest.Mock).mockResolvedValue(duplicatePage);

  await useEntryStore.getState().loadMore();

  expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['1', '2']);
});

it('切换到新查询后旧的 isLoadingMore 不应阻塞新的 loadMore', async () => {
  useEntryStore.setState({ isLoadingMore: true, cursor: 2000, hasMore: true });
  (DB.getEntriesPage as jest.Mock)
    .mockResolvedValueOnce([
      { id: 'fresh', type: 'text', content: 'fresh', timestamp: 1500, syncStatus: 'synced' },
    ])
    .mockResolvedValueOnce([
      { id: 'fresh-2', type: 'text', content: 'fresh-2', timestamp: 1400, syncStatus: 'synced' },
    ]);

  await useEntryStore.getState().applySearchFilters({ query: 'fresh' });
  await useEntryStore.getState().loadMore();

  expect(DB.getEntriesPage).toHaveBeenCalledTimes(2);
});

it('旧查询的分页结果晚返回时不应污染当前查询', async () => {
  const stalePage = createDeferred<any[]>();
  const freshPage = createDeferred<any[]>();

  (DB.getEntriesPage as jest.Mock)
    .mockResolvedValueOnce([{ id: 'first', type: 'text', content: 'first', timestamp: 2000, syncStatus: 'synced' }])
    .mockReturnValueOnce(stalePage.promise)
    .mockResolvedValueOnce([{ id: 'fresh', type: 'text', content: 'fresh', timestamp: 1500, syncStatus: 'synced' }])
    .mockReturnValueOnce(freshPage.promise);

  await useEntryStore.getState().applySearchFilters({ query: 'first' });
  const staleLoadMore = useEntryStore.getState().loadMore();

  await useEntryStore.getState().applySearchFilters({ query: 'fresh' });

  freshPage.resolve([{ id: 'fresh-2', type: 'text', content: 'fresh-2', timestamp: 1400, syncStatus: 'synced' }]);
  await useEntryStore.getState().loadMore();

  stalePage.resolve([{ id: 'stale-2', type: 'text', content: 'stale-2', timestamp: 1300, syncStatus: 'synced' }]);
  await staleLoadMore;

  expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['fresh', 'fresh-2']);
});

it('数据库表未就绪的延迟重试在签名过期后应放弃', async () => {
  jest.useFakeTimers();
  try {
    (DB.getEntriesPage as jest.Mock)
      .mockRejectedValueOnce(new Error('no such table: entries'))
      .mockResolvedValueOnce([{ id: 'fresh', type: 'text', content: 'fresh', timestamp: 1, syncStatus: 'synced' }]);

    const firstLoad = useEntryStore.getState().loadEntries();
    await Promise.resolve();

    useEntryStore.getState().setSearchQuery('fresh');
    await useEntryStore.getState().applyFilters();

    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await firstLoad;

    expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['fresh']);
  } finally {
    jest.useRealTimers();
  }
});
```

- [ ] **Step 3: 运行单测，确认 6 个新用例都处于红灯**

Run:

```bash
cd app && npx jest src/store/__tests__/entryStore.test.ts --runInBand
```

Expected:

```text
FAIL src/store/__tests__/entryStore.test.ts
  entryStore
    loadEntries
      ✕ 旧的首屏请求晚返回时不应覆盖新的筛选结果
    loadMore
      ✕ 重复返回同一分页结果时只保留一份 id
      ✕ 旧查询的分页结果晚返回时不应污染当前查询
```

说明：目标是确认这 6 个新用例在实现前全部红灯；如果其中部分提前变绿，先检查测试是否写成了“伪通过”。

- [ ] **Step 4: 提交只包含测试的红灯版本**

```bash
git add app/src/store/__tests__/entryStore.test.ts
git commit -m "test: cover entryStore duplicate-load race conditions"
```

### Task 2: 实现查询签名、共享首屏查询入口和过期首屏保护

**Files:**
- Modify: `app/src/store/entryStore.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: 在 store 顶部新增查询签名和去重 helper**

先读取并确认 `app/src/store/entryStore.ts` 当前已有的 `buildFilters()` 仍可复用，然后在 `PAGE_SIZE` 和 `MAX_LOAD_RETRIES` 常量附近加入：

```ts
const buildQueryKey = (state: {
  searchQuery: string;
  filterType: string;
  filterDateRange: string;
  selectedTags: string[];
}) =>
  JSON.stringify({
    query: state.searchQuery,
    type: state.filterType,
    dateRange: state.filterDateRange,
    tags: [...state.selectedTags].sort((a, b) => a.localeCompare(b)),
  });

const mergeUniqueById = (prev: Entry[], next: Entry[]): Entry[] => {
  const seen = new Set(prev.map((entry) => entry.id));
  const uniqueNext = next.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  return [...prev, ...uniqueNext];
};
```

要求：
- `buildQueryKey()` 只使用枚举值，不直接编码时间戳边界
- `mergeUniqueById()` 明确保留 `prev` 版本，丢弃 `next` 中同 id 项

- [ ] **Step 2: 抽出录音清理 helper，并显式删除旧的 `filterVersion` 机制**

把当前 `loadEntries()` 里的无效录音清理循环提取成同文件私有 helper，例如：

```ts
const removeBrokenRecordingEntries = async (page: Entry[]): Promise<Entry[]> => {
  const cleaned: Entry[] = [];
  for (const entry of page) {
    if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'paused') {
      try {
        await DB.deleteEntry(entry.id);
        logger.log('🧹 清理无效录音:', entry.id);
        continue;
      } catch {
        // 如果删除失败，保留原 entry，避免静默丢数据
      }
    }
    cleaned.push(entry);
  }
  return cleaned;
};
```

同时删除模块级：

```ts
let filterVersion = 0;
```

以及所有基于 `filterVersion` 的判断与自增逻辑。不要保留“双轨保护”。

- [ ] **Step 3: 在 `EntryStore` 接口和初始状态里新增活动查询字段**

给 `EntryStore` interface 和初始 state 增加：

```ts
activeQueryKey: string;
```

初始化为 `''`，仅用于内部会话隔离，不提供新的 public action。

完成这一步后，再回到 `resetStore()`，把下面这行补上：

```ts
activeQueryKey: '',
```

- [ ] **Step 4: 抽出共享首屏查询流程，统一 `loadEntries` / `applyFilters` / `applySearchFilters`**

在 `create<EntryStore>((set, get) => ({ ... }))` 工厂闭包**内部**引入一个共享的内部函数，例如：

```ts
const runFirstPageQuery = async (queryKey: string, retryCount: number) => {
  try {
    const filters = buildFilters(get());
    const page = await DB.getEntriesPage(filters, PAGE_SIZE);

    const cleaned = await removeBrokenRecordingEntries(page);

    if (get().activeQueryKey !== queryKey) {
      logger.debug('[entryStore] Ignore stale first-page result:', queryKey);
      return;
    }

    set({
      entries: cleaned,
      filteredEntries: cleaned,
      cursor: cleaned.at(-1)?.timestamp ?? null,
      hasMore: page.length === PAGE_SIZE,
      isLoading: false,
      isLoadingMore: false,
      loadRetryCount: retryCount > 0 ? 0 : get().loadRetryCount,
    });
  } catch (error) {
    throw error;
  }
};
```

说明：
- `runFirstPageQuery()` 允许把错误继续抛给调用方
- `loadEntries()` 和 `applyFilters()` 都要各自包一层 `try/catch`
- `loadEntries()` 保留 `no such table` 的自动重试逻辑
- `applyFilters()` 不做自动重试，但若当前会话仍有效，必须把 `isLoading` 正确置回 `false`

然后按下面方式改 3 个入口：

```ts
loadEntries: async () => {
  const state = get();
  const queryKey = buildQueryKey(state);
  set({
    activeQueryKey: queryKey,
    isLoading: true,
    isLoadingMore: false,
    cursor: null,
    hasMore: true,
  });
  return runFirstPageQuery(queryKey, state.loadRetryCount);
},

applySearchFilters: async (filters) => {
  set({
    searchQuery: filters.query ?? get().searchQuery,
    filterType: filters.type ?? get().filterType,
    filterDateRange: filters.dateRange ?? get().filterDateRange,
    selectedTags: filters.tags ?? get().selectedTags,
  });
  await get().applyFilters();
},

applyFilters: async () => {
  const state = get();
  const queryKey = buildQueryKey(state);
  set({
    activeQueryKey: queryKey,
    isLoading: true,
    isLoadingMore: false,
    cursor: null,
    hasMore: true,
  });
  return runFirstPageQuery(queryKey, state.loadRetryCount);
},
```

注意：这里不需要再保留模块级 `filterVersion`。如果会话 key 已能覆盖旧结果回写，删除这套旧防线，避免双轨逻辑。

- [ ] **Step 5: 把数据库表未就绪的重试逻辑挂到查询快照上**

把 `loadEntries()` 的 `catch` 重写为基于 `queryKey` 判断，而不是直接 `setTimeout(() => get().loadEntries(), 500)`：

```ts
if (error?.message?.includes('no such table')) {
  if (retryCount < MAX_LOAD_RETRIES) {
    const nextRetry = retryCount + 1;
    set({ loadRetryCount: nextRetry });
    setTimeout(() => {
      if (get().activeQueryKey !== queryKey) return;
      void runFirstPageQuery(queryKey, nextRetry);
    }, 500);
    return;
  }
}

if (get().activeQueryKey === queryKey) {
  set({ isLoading: false, loadRetryCount: 0 });
}
```

目标：
- 旧查询的重试在签名过期后直接放弃
- loading 生命周期只由当前活动查询结束

- [ ] **Step 6: 跑 store 单测，确认首屏相关新用例转绿**

Run:

```bash
cd app && npx jest src/store/__tests__/entryStore.test.ts --runInBand --testNamePattern="loadEntries|applySearchFilters"
```

Expected:

```text
PASS src/store/__tests__/entryStore.test.ts
  entryStore
    loadEntries
      ✓ 旧的首屏请求晚返回时不应覆盖新的筛选结果
      ✓ 数据库表未就绪的延迟重试在签名过期后应放弃
```

- [ ] **Step 7: 提交首屏会话隔离实现**

```bash
git add app/src/store/entryStore.ts app/src/store/__tests__/entryStore.test.ts
git commit -m "fix: isolate stale first-page entry queries"
```

### Task 3: 实现分页幂等追加、过期分页保护，并完成验证

**Files:**
- Modify: `app/src/store/entryStore.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: 用活动查询 key 包裹 `loadMore()`**

把现有 `loadMore()` 改成只允许当前活动查询写回：

```ts
loadMore: async () => {
  const { cursor, isLoadingMore, hasMore, activeQueryKey } = get();
  if (isLoadingMore || !hasMore) return;

  set({ isLoadingMore: true });

  try {
    const filters = buildFilters(get());
    const page = await DB.getEntriesPage(filters, PAGE_SIZE, cursor ?? undefined);

    if (get().activeQueryKey !== activeQueryKey) {
      logger.debug('[entryStore] Ignore stale loadMore result:', activeQueryKey);
      return;
    }

    set((state) => {
      const nextEntries = mergeUniqueById(state.entries, page);
      return {
        entries: nextEntries,
        filteredEntries: nextEntries,
        cursor: page.at(-1)?.timestamp ?? state.cursor,
        hasMore: page.length === PAGE_SIZE,
        isLoadingMore: false,
      };
    });
  } catch (error) {
    logger.error('Failed to load more entries:', error);
    if (get().activeQueryKey === activeQueryKey) {
      set({ isLoadingMore: false });
    }
  }
},
```

关键点：
- 第二次 `loadMore()` 仍由 `isLoadingMore` 拦截
- 旧分页结果晚到时直接丢弃
- `entries` 和 `filteredEntries` 在同一次 `set()` 中原子更新

- [ ] **Step 2: 补一个“重复页 + 新页”混合结果的期望**

把 `重复返回同一分页结果时只保留一份 id` 这个测试扩成同时验证顺序和 `cursor`：

```ts
expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['1', '2']);
expect(useEntryStore.getState().cursor).toBe(1000);
expect(useEntryStore.getState().isLoadingMore).toBe(false);
expect(useEntryStore.getState().hasMore).toBe(false);
```

- [ ] **Step 3: 跑全部 `entryStore` 测试**

Run:

```bash
cd app && npx jest src/store/__tests__/entryStore.test.ts --runInBand
```

Expected:

```text
PASS src/store/__tests__/entryStore.test.ts
Test Suites: 1 passed, 1 total
Tests:       15+ passed, 0 failed
```

- [ ] **Step 4: 跑项目级回归与类型检查**

Run:

```bash
cd app && npm test -- --runInBand
cd app && npm run typecheck
```

Expected:

```text
Test Suites: all passed
Tests:       all passed
```

```text
tsc --noEmit
Done in ...
```

- [ ] **Step 5: 做手动验证并记录结果**

按 spec 手动过一遍：

1. 打开搜索，输入关键词，提交后关闭 `SearchOverlay`
2. 回到时间线观察首页结果，不应立刻双份
3. 轻微滚动触发加载更多，不应出现重复项
4. 连续切换两组不同筛选条件，旧查询结果不应闪回
5. 清空筛选后列表应恢复正常

把结果记录到本次工作日志或 PR/commit 说明中；如果当前流程没有单独的 PR 描述文件，就在最终汇报里逐项写明手动验证结果。若任一步不稳定，不要继续下个提交。

- [ ] **Step 6: 提交分页防重与最终验证**

```bash
git add app/src/store/entryStore.ts app/src/store/__tests__/entryStore.test.ts
git commit -m "fix: dedupe stale paginated entry loads"
```

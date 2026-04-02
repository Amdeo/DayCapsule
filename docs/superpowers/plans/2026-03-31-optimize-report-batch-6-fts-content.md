# Optimize Report Batch 6 FTS Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace local content search's `%query%` full scans with a SQLite FTS5 index on `entries.content`, while keeping exact tag filtering unchanged.

**Architecture:** Phase 1 keeps semantics narrow: only `content` is indexed in FTS. Implementation should add an `entries_fts` virtual table, backfill it for existing rows, keep it synchronized from local write paths, and switch local search queries to FTS-backed lookups. Tags remain outside FTS and continue to use the existing normalized tables for exact filters.

**Tech Stack:** TypeScript, Expo SQLite, SQLite FTS5, Jest

---

### Task 1: Add FTS Schema And Migration Backfill

**Files:**
- Modify: `app/src/database/sqlite.ts`
- Modify: `app/src/database/migration.ts`
- Test: `app/src/database/__tests__/sqlite.test.ts`
- Test: `app/src/database/__tests__/migration.test.ts`

- [ ] **Step 1: Write the failing tests**

In `app/src/database/__tests__/sqlite.test.ts`, add a schema assertion after the existing sync-status index checks:

```ts
it('creates the entries_fts virtual table in the base schema', async () => {
  await initDatabase();

  const db = openDatabase() as { execAsync: jest.Mock };
  const createFtsSql = db.execAsync.mock.calls
    .map(([sql]) => sql as string)
    .find((sql) => sql.includes('CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5'));

  expect(createFtsSql).toContain('entry_id UNINDEXED');
  expect(createFtsSql).toContain('content');
});
```

In `app/src/database/__tests__/migration.test.ts`, import a new migration function such as `migrateEntriesContentToFts` and add this backfill regression:

```ts
it('creates entries_fts and backfills existing entry content', async () => {
  mockDb.getAllAsync
    .mockResolvedValueOnce([
      { name: 'id' },
      { name: 'type' },
      { name: 'content' },
      { name: 'timestamp' },
    ])
    .mockResolvedValueOnce([
      { id: 'entry-1', content: '旅行日记' },
      { id: 'entry-2', content: '工作总结' },
    ]);

  await migrateEntriesContentToFts();

  expect(mockDb.runAsync).toHaveBeenCalledWith(
    expect.stringContaining('CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5')
  );
  expect(mockDb.runAsync).toHaveBeenCalledWith(
    `DELETE FROM entries_fts`
  );
  expect(mockDb.runAsync).toHaveBeenCalledWith(
    `INSERT INTO entries_fts (entry_id, content) SELECT id, content FROM entries`
  );
});
```

Add a second idempotency test proving the migration skips backfill when the table already exists and the MMKV marker is present only if you need it to encode the chosen idempotency behavior. If current implementation can be safely idempotent without an MMKV marker, prefer that simpler route and test repeated execution instead.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/migration.test.ts
```

Expected: FAIL because the FTS table and migration do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

In `app/src/database/sqlite.ts`, add base-schema creation for the FTS table after `entries` and supporting tables are created:

```ts
await db.execAsync(`
  CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    entry_id UNINDEXED,
    content
  );
`);
```

In `app/src/database/migration.ts`, add a dedicated migration function, for example:

```ts
export const migrateEntriesContentToFts = async (): Promise<void> => {
  const db = getDatabase();
  try {
    await db.runAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
        entry_id UNINDEXED,
        content
      )
    `);
    await db.runAsync(`DELETE FROM entries_fts`);
    await db.runAsync(`INSERT INTO entries_fts (entry_id, content) SELECT id, content FROM entries`);
    logger.log('✅ entries_fts 回填完成');
  } catch (error) {
    logger.error('❌ entries_fts 迁移失败:', error);
  }
};
```

Keep this migration narrowly focused on local `content` backfill only.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/migration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/sqlite.ts src/database/migration.ts src/database/__tests__/sqlite.test.ts src/database/__tests__/migration.test.ts
git commit -m "feat: add content fts schema"
```

### Task 2: Keep FTS Synchronized On Local Writes

**Files:**
- Modify: `app/src/database/operations.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Write the failing tests**

In `app/src/database/__tests__/operations.test.ts`, add focused SQL-shape regressions proving FTS synchronization happens on all local write paths.

Add an `addEntry` regression:

```ts
it('addEntry 应同步写入 entries_fts content 索引', async () => {
  mockDb.runAsync.mockResolvedValue(undefined);

  const result = await addEntry({ type: 'text' as const, content: 'FTS 新记录' });

  expect(mockDb.runAsync).toHaveBeenCalledWith(
    `INSERT INTO entries_fts (entry_id, content) VALUES (?, ?)`,
    [result.id, 'FTS 新记录']
  );
});
```

Add an `updateEntry` regression:

```ts
it('updateEntry 更新 content 时应同步刷新 entries_fts', async () => {
  mockDb.runAsync.mockResolvedValue(undefined);

  await updateEntry('entry-1', { content: 'FTS 更新内容' });

  expect(mockDb.runAsync).toHaveBeenCalledWith(
    `DELETE FROM entries_fts WHERE entry_id = ?`,
    ['entry-1']
  );
  expect(mockDb.runAsync).toHaveBeenCalledWith(
    `INSERT INTO entries_fts (entry_id, content) VALUES (?, ?)`,
    ['entry-1', 'FTS 更新内容']
  );
});
```

Add a `deleteEntry` regression:

```ts
it('deleteEntry 应删除对应的 entries_fts 记录', async () => {
  mockDb.runAsync.mockResolvedValue(undefined);

  await deleteEntry('entry-1');

  expect(mockDb.runAsync).toHaveBeenCalledWith(
    'DELETE FROM entries_fts WHERE entry_id = ?',
    ['entry-1']
  );
});
```

Add a `restoreEntries` regression:

```ts
it('restoreEntries 应回填恢复记录的 entries_fts content', async () => {
  mockDb.getAllAsync.mockResolvedValue([
    { name: 'id' },
    { name: 'type' },
    { name: 'content' },
    { name: 'timestamp' },
    { name: 'tags' },
    { name: 'media_json' },
  ]);
  mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => callback());
  mockDb.getFirstAsync.mockResolvedValueOnce({ changes: 1 });

  await restoreEntries([
    { id: 'restore-fts-1', type: 'text', content: '恢复全文索引', timestamp: 1, syncStatus: 'synced' },
  ]);

  expect(mockDb.runAsync).toHaveBeenCalledWith(
    `INSERT INTO entries_fts (entry_id, content) VALUES (?, ?)`,
    ['restore-fts-1', '恢复全文索引']
  );
});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Expected: FAIL because write paths do not yet maintain `entries_fts`.

- [ ] **Step 3: Write the minimal implementation**

In `app/src/database/operations.ts`, add two small file-local helpers:

```ts
const upsertEntryContentFts = async (
  db: ReturnType<typeof getDatabase>,
  entryId: string,
  content: string
): Promise<void> => {
  await db.runAsync(`DELETE FROM entries_fts WHERE entry_id = ?`, [entryId]);
  await db.runAsync(`INSERT INTO entries_fts (entry_id, content) VALUES (?, ?)`, [entryId, content]);
};

const deleteEntryContentFts = async (
  db: ReturnType<typeof getDatabase>,
  entryId: string
): Promise<void> => {
  await db.runAsync(`DELETE FROM entries_fts WHERE entry_id = ?`, [entryId]);
};
```

Call them from:

- `addEntry()` after the row is inserted
- `updateEntry()` only when `updates.content !== undefined`
- `deleteEntry()` before or after deleting from `entries`
- `restoreEntries()` when a row was actually inserted (`changes > 0`)

Do not add trigger-based synchronization in this phase.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/operations.ts src/database/__tests__/operations.test.ts
git commit -m "feat: sync content fts writes"
```

### Task 3: Switch Local Search To FTS Content Lookup

**Files:**
- Modify: `app/src/database/operations.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Write the failing tests**

Update the existing search assertions in `operations.test.ts` so they lock the new FTS-backed SQL form.

Replace the current `searchEntries` expectations with:

```ts
it('searchEntries 应使用 entries_fts MATCH 查询 content', async () => {
  mockDb.getAllAsync.mockResolvedValue([]);

  await searchEntries('测试');

  const [sql, params] = mockDb.getAllAsync.mock.calls[0];
  expect(sql).toContain('JOIN entries_fts f ON f.entry_id = e.id');
  expect(sql).toContain('f.content MATCH ?');
  expect(params).toEqual(['测试*', 100]);
});
```

Update the current `getEntriesPage({ search })` assertion to:

```ts
it('getEntriesPage 传入 search 时应通过 entries_fts 过滤 content', async () => {
  mockDb.getAllAsync.mockResolvedValue([]);

  await getEntriesPage({ search: '旅行' }, 20);

  const [sql, params] = mockDb.getAllAsync.mock.calls.at(-1) ?? [];
  expect(sql).toContain('e.id IN (SELECT f.entry_id FROM entries_fts f WHERE f.content MATCH ?)');
  expect(params).toContain('旅行*');
  expect(sql).not.toContain('e.tags LIKE ?');
});
```

These tests encode the phase-1 semantic shift: free-text search is content-only FTS, not JSON-tag matching.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Expected: FAIL because local search still uses `LIKE`.

- [ ] **Step 3: Write the minimal implementation**

In `app/src/database/operations.ts`, update `searchEntries()` to:

```ts
export const searchEntries = async (query: string, limit = 100): Promise<Entry[]> => {
  try {
    const db = getDatabase();
    const normalizedQuery = `${query.trim()}*`;
    const result = await db.getAllAsync<EntryRow>(
      `SELECT e.* FROM entries e
       JOIN entries_fts f ON f.entry_id = e.id
       WHERE f.content MATCH ?
       ORDER BY e.timestamp DESC
       LIMIT ?`,
      [normalizedQuery, limit]
    );
    return result.map(rowToEntry);
  } catch (error) {
    logger.error('Failed to search entries:', error);
    return [];
  }
};
```

Then update `getEntriesPage()` search handling from:

```ts
conditions.push('(e.content LIKE ? OR e.tags LIKE ?)');
params.push(`%${filters.search}%`, `%${filters.search}%`);
```

to:

```ts
conditions.push('e.id IN (SELECT f.entry_id FROM entries_fts f WHERE f.content MATCH ?)');
params.push(`${filters.search.trim()}*`);
```

Do not change the existing exact tag-filter subqueries.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/operations.ts src/database/__tests__/operations.test.ts
git commit -m "feat: use content fts for local search"
```

### Task 4: Final Verification

**Files:**
- Verify only: `app/src/database/sqlite.ts`
- Verify only: `app/src/database/migration.ts`
- Verify only: `app/src/database/operations.ts`
- Verify only: related tests above

- [ ] **Step 1: Run focused database suites**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/database/__tests__/sqlite.test.ts src/database/__tests__/migration.test.ts src/database/__tests__/operations.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run project verify**

Run:

```bash
pnpm run verify
```

Expected: PASS. If unrelated pre-existing failures appear, record them exactly and stop widening scope.

- [ ] **Step 3: Commit**

```bash
git add src/database/sqlite.ts src/database/migration.ts src/database/operations.ts src/database/__tests__/sqlite.test.ts src/database/__tests__/migration.test.ts src/database/__tests__/operations.test.ts
git commit -m "feat: add content fts search"
```

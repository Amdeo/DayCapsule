# Optimize Report Batch 2 Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the SQL statement count of `upsertEntryTags()` by batching tag and tag-association writes while preserving current behavior for `addEntry`, `updateEntry`, and `restoreEntries`.

**Architecture:** Keep the optimization entirely inside `app/src/database/operations.ts`. Existing callers should continue to call `upsertEntryTags()` the same way, while the helper deduplicates one entry's tags and replaces the old per-tag insert loop with one batched `tags` insert and one batched `entry_tags` insert. Tests stay focused in `operations.test.ts` and should prove both SQL shape and unchanged caller behavior.

**Tech Stack:** TypeScript, Expo SQLite, Jest

---

### Task 1: Batch `upsertEntryTags` SQL While Preserving Behavior

**Files:**
- Modify: `app/src/database/operations.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Write the failing tests**

In `app/src/database/__tests__/operations.test.ts`, replace the old multi-tag concurrency expectation in the `addEntry` section with a batched-SQL expectation and add a duplicate-tag regression.

Replace:

```ts
it('有多个 tags 时应并发发起每个 tag 的首个 SQL，再继续关联写入', async () => {
  const pendingTagWrites: Array<{ sql: string; resolve: () => void }> = [];

  mockDb.getAllAsync.mockResolvedValue([{ name: 'id' }, { name: 'type' }, { name: 'content' }, { name: 'timestamp' }, { name: 'tags' }]);
  mockDb.runAsync.mockImplementation((sql: string) => {
    if (sql.includes('INSERT OR IGNORE INTO tags') || sql.includes('INSERT OR IGNORE INTO entry_tags')) {
      return new Promise<void>((resolve) => {
        pendingTagWrites.push({ sql, resolve });
      });
    }
    return Promise.resolve(undefined);
  });

  const addEntryPromise = addEntry({
    type: 'text' as const,
    content: '并发标签',
    tags: ['工作', '重要'],
  });

  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  expect(pendingTagWrites).toHaveLength(2);
  expect(pendingTagWrites.every(({ sql }) => sql.includes('INSERT OR IGNORE INTO tags'))).toBe(true);

  pendingTagWrites.splice(0).forEach(({ resolve }) => resolve());
  await waitFor(() => {
    expect(
      pendingTagWrites.some(({ sql }) => sql.includes('entry_tags'))
    ).toBe(true);
  });

  expect(pendingTagWrites).toHaveLength(2);
  expect(pendingTagWrites.every(({ sql }) => sql.includes('INSERT OR IGNORE INTO entry_tags'))).toBe(true);

  pendingTagWrites.splice(0).forEach(({ resolve }) => resolve());
  await addEntryPromise;
});
```

with:

```ts
it('有多个 tags 时应批量写入 tags 和 entry_tags', async () => {
  mockDb.runAsync.mockResolvedValue(undefined);

  await addEntry({
    type: 'text' as const,
    content: '批量标签',
    tags: ['工作', '重要'],
  });

  const sqlCalls = mockDb.runAsync.mock.calls.map(([sql, params]) => ({
    sql: sql as string,
    params: params as unknown[],
  }));

  const tagInsert = sqlCalls.find(({ sql }) =>
    sql.includes('INSERT OR IGNORE INTO tags (name) VALUES (?, ?)')
  );
  const entryTagInsert = sqlCalls.find(({ sql }) =>
    sql.includes('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)')
  );

  expect(tagInsert?.params).toEqual(['工作', '重要']);
  expect(entryTagInsert?.sql).toContain('WHERE name IN (?, ?)');
  expect(entryTagInsert?.params?.slice(1)).toEqual(['工作', '重要']);
});
```

Add this new regression right after it:

```ts
it('单条记录的重复 tags 应在批量写入前去重', async () => {
  mockDb.runAsync.mockResolvedValue(undefined);

  await addEntry({
    type: 'text' as const,
    content: '去重标签',
    tags: ['工作', '工作', '重要'],
  });

  const sqlCalls = mockDb.runAsync.mock.calls.map(([sql, params]) => ({
    sql: sql as string,
    params: params as unknown[],
  }));

  const tagInsert = sqlCalls.find(({ sql }) =>
    sql.includes('INSERT OR IGNORE INTO tags (name) VALUES (?, ?)')
  );
  const entryTagInsert = sqlCalls.find(({ sql }) =>
    sql.includes('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)')
  );

  expect(tagInsert?.params).toEqual(['工作', '重要']);
  expect(entryTagInsert?.sql).toContain('WHERE name IN (?, ?)');
  expect(entryTagInsert?.params?.slice(1)).toEqual(['工作', '重要']);
});
```

In the `restoreEntries` section, add a focused regression proving restore still dual-writes tags after the batching change:

```ts
it('恢复带 tags 的记录时应继续写入规范化标签关联', async () => {
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
    {
      id: 'tagged-restore-1',
      type: 'text',
      content: 'restore tags',
      timestamp: 1,
      tags: ['恢复', '批量'],
    },
  ]);

  const sqlCalls = mockDb.runAsync.mock.calls.map(([sql, params]) => ({
    sql: sql as string,
    params: params as unknown[],
  }));

  expect(sqlCalls.some(({ sql }) => sql.includes('DELETE FROM entry_tags'))).toBe(true);
  expect(sqlCalls.some(({ sql }) => sql.includes('INSERT OR IGNORE INTO tags (name) VALUES (?, ?)'))).toBe(true);
  expect(
    sqlCalls.some(({ sql }) =>
      sql.includes('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)') &&
      sql.includes('WHERE name IN (?, ?)')
    )
  ).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Expected: FAIL because `upsertEntryTags()` still emits the old per-tag SQL shape.

- [ ] **Step 3: Write the minimal implementation**

In `app/src/database/operations.ts`, keep the helper signature unchanged and replace the loop body with deduplicated batched SQL.

Update `upsertEntryTags` to this shape:

```ts
const upsertEntryTags = async (
  db: ReturnType<typeof getDatabase>,
  entryId: string,
  tags: string[]
): Promise<void> => {
  const normalizedTags = [...new Set(tags)];

  await db.runAsync(`DELETE FROM entry_tags WHERE entry_id = ?`, [entryId]);

  if (normalizedTags.length === 0) {
    return;
  }

  const valuesPlaceholders = normalizedTags.map(() => '(?)').join(', ');
  await db.runAsync(
    `INSERT OR IGNORE INTO tags (name) VALUES ${valuesPlaceholders}`,
    normalizedTags
  );

  const inPlaceholders = normalizedTags.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)
     SELECT ?, id FROM tags WHERE name IN (${inPlaceholders})`,
    [entryId, ...normalizedTags]
  );
};
```

Do not change any caller signatures or move this logic into a new abstraction unless a tiny local placeholder helper is strictly needed.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Then run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/database/operations.ts src/database/__tests__/operations.test.ts
git commit -m "perf: batch entry tag upserts"
```

### Task 2: Final Verification

**Files:**
- Verify only: `app/src/database/operations.ts`
- Verify only: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: Run the focused database suite**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run project verify**

Run:

```bash
npm run verify
```

Expected: PASS. If unrelated pre-existing failures appear, record them exactly and stop widening scope.

- [ ] **Step 3: Commit**

```bash
git add src/database/operations.ts src/database/__tests__/operations.test.ts
git commit -m "perf: optimize entry tag writes"
```

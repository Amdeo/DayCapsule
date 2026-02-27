# 存储架构演进 - 实现总结

## 当前状态

✅ **三阶段重构已完成**，TypeScript 零错误，35 个单元测试全部通过。

---

## 架构演进路径

```
初始版本                Phase 1              Phase 2              Phase 3
─────────────          ─────────────        ─────────────        ─────────────
AsyncStorage           MMKV                 游标分页              Tags 规范化
（全量加载）    →      替换设置存储   →     无限滚动       →     关联表查询
```

---

## Phase 1：MMKV 替换 AsyncStorage

### 变更文件

| 文件 | 变更内容 |
|------|---------|
| `src/utils/storage.ts` | `AsyncStorage` → `createMMKV({ id: 'app-storage' })` |
| `src/database/migration.ts` | 迁移标志位 → `createMMKV({ id: 'migration' })` |

### 关键决策

- **MMKV v4 API**：使用 `createMMKV()` 工厂函数（非 `new MMKV()`），删除用 `remove(key)`（非 `delete(key)`）
- **双实例隔离**：`app-storage`（应用设置）与 `migration`（迁移标志）分开，避免键名冲突
- **AsyncStorage 保留**：历史 `entries` / `entries_backup` 数据仍在 AsyncStorage，迁移时一次性读取后不再写入
- **接口不变**：`Storage` 对象保持 `async` 接口，调用方零改动

### 性能对比

| 操作 | AsyncStorage | MMKV |
|------|-------------|------|
| 同步读取 | ❌ 不支持 | ✅ 支持 |
| 写入速度 | ~1ms | ~0.01ms（30x） |
| 内存占用 | 较高 | 极低 |

---

## Phase 2：游标分页

### 变更文件

| 文件 | 变更内容 |
|------|---------|
| `src/database/operations.ts` | 新增 `EntryFilters` 接口 + `getEntriesPage()` |
| `src/store/entryStore.ts` | 新增 `cursor / hasMore / isLoadingMore / loadMore()` |
| `src/components/Timeline.v2.tsx` | 接入 `onEndReached` + `ListFooterComponent` |

### 游标分页设计

```
首页：getEntriesPage(filters, 20)
        ↓ 返回 20 条，cursor = 最后一条.timestamp
翻页：getEntriesPage(filters, 20, cursor)
        ↓ WHERE timestamp < cursor ORDER BY timestamp DESC LIMIT 20
```

**选择 timestamp 作游标的原因**：
- 避免 offset 分页在数据插入时跳过记录
- timestamp 天然有序，无需额外索引
- 与现有 `idx_entries_timestamp` 索引完全匹配

### Store 状态机

```
loadEntries()          →  cursor=null, hasMore=true, 加载第一页
loadMore()             →  cursor=上页末尾, 追加下一页
applyFilters()         →  重置 cursor=null, 重新加载第一页
hasMore=false          →  停止触发 loadMore
isLoadingMore=true     →  防止重复请求
```

---

## Phase 3：Tags 规范化

### 变更文件

| 文件 | 变更内容 |
|------|---------|
| `src/database/sqlite.ts` | 新增 `tags` 表、`entry_tags` 表、相关索引 |
| `src/database/operations.ts` | 新增 `upsertEntryTags()`，`addEntry`/`updateEntry` 双写，`getAllTags` 改查规范化表 |
| `src/database/migration.ts` | 新增 `migrateTagsToNormalized()`（幂等） |
| `app/app/_layout.tsx` | 启动序列加入 `migrateTagsToNormalized()` 调用 |

### 双写策略

```
写入 entry 时：
  1. entries.tags = JSON.stringify(tags)   ← 向后兼容
  2. upsertEntryTags(entryId, tags)        ← 规范化表
     ├── DELETE FROM entry_tags WHERE entry_id = ?
     ├── INSERT OR IGNORE INTO tags (name) VALUES (?)
     └── INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) SELECT ...
```

### 多标签 AND 过滤（SQL）

```sql
-- 每个 tag 一个 IN 子查询，AND 语义
WHERE e.id IN (
  SELECT et.entry_id FROM entry_tags et
  JOIN tags t ON et.tag_id = t.id WHERE t.name = '工作'
)
AND e.id IN (
  SELECT et.entry_id FROM entry_tags et
  JOIN tags t ON et.tag_id = t.id WHERE t.name = '重要'
)
```

### 迁移幂等性

```typescript
// 已迁移则直接返回，不重复执行
if (migrationStore.getString('tags_normalized') === 'true') return;
```

---

## 启动序列

```
app/_layout.tsx → initializeApp()
  ├── [并行] initializeFileSystem()
  ├── [并行] VoiceService.initializeAudio()
  ├── initDatabase()              ← 建表 + 索引
  ├── migrateFromAsyncStorage()   ← 历史数据迁移（幂等）
  └── migrateTagsToNormalized()   ← tags 规范化（幂等）
```

---

## 测试覆盖

```
src/store/__tests__/entryStore.test.ts      ← 18 个测试
  loadEntries / loadMore / addEntry / deleteEntry / filters

src/database/__tests__/operations.test.ts   ← 17 个测试
  getAllEntries / getEntriesPage / searchEntries
  addEntry（双写验证）/ deleteEntry / getAllTags / getEntriesCount

总计：35 个测试，全部通过
```

---

## 索引清单

```sql
idx_entries_timestamp        ON entries(timestamp DESC)   ← 分页主索引
idx_entries_type             ON entries(type)
idx_entries_recording_status ON entries(recording_status)
idx_entry_tags_tag           ON entry_tags(tag_id)
idx_entry_tags_entry         ON entry_tags(entry_id)
```

---

## 已知限制

| 限制 | 说明 |
|------|------|
| Expo Go 不兼容 | MMKV 需要原生模块，需 EAS Build |
| 全文搜索为 LIKE | 大数据量下性能有限，可升级为 FTS5 |
| tags JSON 列冗余 | 双写增加写入开销，未来可考虑移除 JSON 列 |

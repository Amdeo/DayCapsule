# 快速参考指南

## 开发命令

```bash
cd app/

npm start          # 启动 Metro bundler
npm run ios        # iOS 模拟器（需要 EAS Build / custom dev client）
npm run android    # Android 模拟器
npm run web        # Web 浏览器
npx tsc --noEmit   # TypeScript 类型检查
npx jest --no-coverage  # 运行单元测试
```

---

## 存储架构

```
┌─────────────────────────────────────────────────────┐
│                  UI 组件 / 页面                       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           useEntryStore (Zustand)                    │
│  entries / filteredEntries / cursor / hasMore        │
│  loadEntries() / loadMore() / addEntry() ...         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│         database/operations.ts (SQL 层)              │
│  getEntriesPage / addEntry / updateEntry / ...       │
└──────────┬───────────────────────────────────────────┘
           │
┌──────────▼──────────┐   ┌──────────────────────────┐
│  expo-sqlite v16     │   │  react-native-mmkv v4    │
│  entries 表          │   │  app-storage 实例         │
│  tags 表             │   │  （设置、偏好）            │
│  entry_tags 表       │   │  migration 实例           │
└─────────────────────┘   │  （迁移标志位）            │
                           └──────────────────────────┘
```

### 存储职责划分

| 数据类型 | 存储方案 | 原因 |
|---------|---------|------|
| 日记条目（entries） | SQLite | 结构化、可分页、可关联查询 |
| 应用设置 | MMKV (`app-storage`) | 同步读写、高性能 |
| 迁移标志位 | MMKV (`migration`) | 独立命名空间，避免污染 |
| 历史备份数据 | AsyncStorage | 一次性读取，迁移后不再写入 |

---

## 状态管理 API

```typescript
import { useEntryStore } from '@/src/store/entryStore';

const {
  entries,           // 当前已加载的条目
  filteredEntries,   // 过滤后的条目（供 Timeline 使用）
  isLoading,         // 首次加载中
  isLoadingMore,     // 翻页加载中
  hasMore,           // 是否还有更多页
  cursor,            // 当前游标（最后一条的 timestamp）

  loadEntries,       // 重置并加载第一页
  loadMore,          // 追加下一页（游标分页）
  addEntry,
  updateEntry,
  deleteEntry,
  refreshEntries,    // 静默刷新（不显示 loading）

  filterType,        // 'all' | 'text' | 'photo' | 'voice'
  filterDateRange,   // 'all' | 'today' | 'week' | 'month'
  searchQuery,
  selectedTags,

  setFilterType,
  setFilterDateRange,
  setSearchQuery,
  toggleTag,
  clearTags,
  applyFilters,      // 重置游标并重新查询

  getRecentEntries,  // (limit?: number) => Entry[]
  getAllTags,         // () => Promise<string[]>
} = useEntryStore();
```

### 无限滚动接入

```tsx
import { ActivityIndicator } from 'react-native';

<SectionList
  onEndReached={() => { if (hasMore) loadMore(); }}
  onEndReachedThreshold={0.3}
  ListFooterComponent={
    isLoadingMore
      ? <ActivityIndicator size="small" color="#8B7355" style={{ paddingVertical: 16 }} />
      : null
  }
/>
```

---

## 数据库 API

```typescript
import {
  getEntriesPage,
  addEntry,
  updateEntry,
  deleteEntry,
  getAllTags,
  getEntriesCount,
} from '@/src/database/operations';

// 游标分页（首页不传 cursor）
const page = await getEntriesPage(
  { type: 'text', search: '旅行', tags: ['工作'] },
  20,          // limit
  cursor       // 上一页最后一条的 timestamp
);

// 获取所有标签（从规范化 tags 表）
const tags = await getAllTags();
```

### EntryFilters 类型

```typescript
interface EntryFilters {
  type?: 'text' | 'photo' | 'voice';
  startTime?: number;   // 时间范围起点（毫秒时间戳）
  search?: string;      // 全文搜索（content + tags）
  tags?: string[];      // 标签过滤（AND 语义）
}
```

---

## 设置存储 API

```typescript
import { Storage } from '@/src/utils/storage';

// 底层使用 MMKV，接口保持 async 兼容
await Storage.setString('settings:autoBackup', 'true');
const val = await Storage.getString('settings:autoBackup');

await Storage.setObject('settings:theme', { mode: 'dark' });
const theme = await Storage.getObject<ThemeSettings>('settings:theme');

await Storage.delete('settings:autoBackup');
```

---

## 数据库表结构

```sql
-- 主表
CREATE TABLE entries (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,          -- 'text' | 'photo' | 'voice'
  content          TEXT NOT NULL,
  timestamp        INTEGER NOT NULL,
  tags             TEXT,                   -- JSON 数组（向后兼容）
  media_uri        TEXT,
  media_type       TEXT,
  media_duration   INTEGER,
  recording_status TEXT,
  recording_duration INTEGER,
  created_at       INTEGER,
  updated_at       INTEGER
);

-- 规范化标签表
CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

-- 关联表（支持多标签 AND 过滤）
CREATE TABLE entry_tags (
  entry_id TEXT    NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);
```

---

## 类型定义

```typescript
interface Entry {
  id: string;
  type: 'text' | 'photo' | 'voice';
  content: string;
  timestamp: number;
  tags?: string[];
  media?: { uri: string; mimeType: string; size: number; duration?: number };
  recordingStatus?: string;
  recordingDuration?: number;
  syncStatus: 'synced' | 'pending' | 'error';
}
```

---

## 文件结构

```
app/src/
├── store/
│   └── entryStore.ts          # Zustand store（游标分页 + 过滤）
├── database/
│   ├── sqlite.ts              # DB 初始化、表创建、索引
│   ├── operations.ts          # CRUD + getEntriesPage + upsertEntryTags
│   └── migration.ts           # AsyncStorage → SQLite 迁移 + tags 规范化
├── utils/
│   ├── storage.ts             # MMKV 封装（async 接口）
│   └── logger.ts              # 日志工具
└── services/
    ├── voiceService.ts
    ├── photoService.ts
    └── backupService.ts
```

---

## 常见问题

### Q: 为什么不能在 Expo Go 中运行？

MMKV 需要原生模块，必须使用 EAS Build 或 custom dev client。

```bash
# 构建 dev client
eas build --profile development --platform ios
```

### Q: 如何调试 SQLite 数据？

```typescript
import { getDatabase } from '@/src/database/sqlite';

const db = getDatabase();
const rows = await db.getAllAsync('SELECT * FROM entries LIMIT 10');
console.log(rows);
```

### Q: 如何重置迁移状态（开发调试）？

```typescript
import { rollbackMigration } from '@/src/database/migration';
await rollbackMigration(); // 从备份恢复到 AsyncStorage，清空 SQLite
```

### Q: 翻页不触发？

检查 `onEndReachedThreshold`（建议 0.3），以及 `hasMore` 是否为 `true`。

---

## 相关文档

- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 架构演进与设计决策
- [expo-sqlite 文档](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [react-native-mmkv 文档](https://github.com/mrousavy/react-native-mmkv)
- [Zustand 文档](https://github.com/pmndrs/zustand)

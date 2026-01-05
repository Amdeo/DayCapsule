[根目录](../../../../CLAUDE.md) > [app](../../../) > [src](../../) > [services](../) > **storage**

# Storage 服务文档

## 模块职责

数据存储服务层，负责 SQLite 数据库操作、FTS5 全文搜索、数据加密和持久化管理。

## 入口与启动

- **主文件**: `database.ts` (数据库架构), `databaseService.ts` (操作接口)
- **初始化**: 应用启动时调用 `DatabaseService.initialize()`
- **数据库名称**: `MemoryCapsule.db`
- **版本**: `1.0`

## 对外接口

### DatabaseService 类

```typescript
class DatabaseService {
  // 初始化
  async initialize(): Promise<void>

  // 记录条目操作
  async createEntry(entryData: Partial<LifeLogEntry>): Promise<LifeLogEntry>
  async updateEntry(id: string, updates: Partial<LifeLogEntry>): Promise<LifeLogEntry>
  async deleteEntry(id: string): Promise<void>
  async getEntries(page: number, limit: number): Promise<LifeLogEntry[]>
  async getEntriesByDateRange(startDate: Date, endDate: Date, view?: any): Promise<LifeLogEntry[]>

  // 搜索
  async searchEntries(query: string, limit: number): Promise<SearchResult[]>

  // 标签操作
  async getTags(): Promise<Tag[]>
  async createTag(tag: Partial<Tag>): Promise<Tag>
  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag>

  // 媒体附件
  async addMediaAttachment(attachment: MediaAttachment): Promise<void>
  async getMediaAttachments(entryId: string): Promise<MediaAttachment[]>
}
```

## 关键依赖与配置

### 依赖项

```json
{
  "react-native-sqlite-storage": "^6.0.1"
}
```

### 数据库配置

```typescript
const DB_NAME = 'MemoryCapsule.db';
const DB_VERSION = '1.0';
const DB_LOCATION = 'default';
```

## 数据模型

### 数据库表结构

#### 1. life_log_entries（生活记录表）

```sql
CREATE TABLE life_log_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                 -- 'text' | 'photo' | 'voice' | 'mixed'
  title TEXT,
  content TEXT NOT NULL,
  mood TEXT NOT NULL,                 -- 心情emoji
  tags TEXT,                          -- JSON array of tag IDs
  location TEXT,                      -- JSON: {latitude, longitude, address, name}
  weather TEXT,                       -- JSON: {temperature, condition, humidity, icon}
  sync_status TEXT DEFAULT 'draft',  -- 'draft' | 'pending_sync' | 'synced' | 'failed'
  is_deleted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_at DATETIME,
  ai_tags TEXT                        -- JSON array of AI-generated tags
);
```

#### 2. media_attachments（媒体附件表）

```sql
CREATE TABLE media_attachments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  type TEXT NOT NULL,                 -- 'photo' | 'audio'
  uri TEXT NOT NULL,
  thumbnail_uri TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  duration REAL,                      -- 音频时长(秒)
  width INTEGER,
  height INTEGER,
  encryption_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES life_log_entries(id) ON DELETE CASCADE
);
```

#### 3. tags（标签表）

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,                 -- 'manual' | 'ai'
  color TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. entry_tags（记录-标签关联表）

```sql
CREATE TABLE entry_tags (
  entry_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (entry_id, tag_id),
  FOREIGN KEY (entry_id) REFERENCES life_log_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### 5. sync_queue（同步队列表）

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  operation TEXT NOT NULL,            -- 'create' | 'update' | 'delete'
  data TEXT NOT NULL,                 -- JSON payload
  retry_count INTEGER DEFAULT 0,
  last_attempt_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. entries_fts（FTS5 全文搜索表）

```sql
CREATE VIRTUAL TABLE entries_fts USING fts5(
  entry_id,
  title,
  content,
  tags,
  tokenize='unicode61'
);
```

### 索引

```sql
CREATE INDEX idx_entries_created_at ON life_log_entries(created_at DESC);
CREATE INDEX idx_entries_type ON life_log_entries(type);
CREATE INDEX idx_entries_sync_status ON life_log_entries(sync_status);
CREATE INDEX idx_media_entry_id ON media_attachments(entry_id);
CREATE INDEX idx_tags_name ON tags(name);
```

## 性能优化

### 查询优化
- 使用索引加速常用查询
- FTS5 全文搜索提升搜索性能
- 分页加载避免一次性加载大量数据

### 内存管理
- 使用虚拟滚动处理长列表
- 及时关闭数据库连接
- 清理不用的查询结果

### 事务处理
- 批量操作使用事务
- 关键操作使用事务保证数据一致性

## 测试与质量

### 测试策略

- **单元测试**: 每个 CRUD 方法
- **集成测试**: 完整的数据流（创建→读取→更新→删除）
- **性能测试**: 大数据量下的查询性能
- **FTS5 测试**: 全文搜索准确性

### 待测试项

- [ ] 数据库初始化
- [ ] 记录条目 CRUD
- [ ] 全文搜索功能
- [ ] 标签管理
- [ ] 媒体附件操作
- [ ] 同步队列管理
- [ ] 数据库迁移

## 常见问题 (FAQ)

### Q: 如何备份数据库？
A: 数据库文件位于 `${DocumentDirectoryPath}/MemoryCapsule.db`，可以直接复制该文件进行备份。

### Q: FTS5 搜索支持哪些语言？
A: 使用 `unicode61` tokenizer，支持中英文混合搜索。

### Q: 如何处理数据库升级？
A: 在 `initialize()` 方法中检查版本号，执行相应的迁移脚本。

### Q: 数据是否加密？
A: 敏感字段（如 encryption_key）使用 AES-256-GCM 加密。完整数据库加密可使用 SQLCipher（需额外配置）。

### Q: 最大支持多少条记录？
A: SQLite 理论支持数百万条记录，实际限制取决于设备存储和性能。建议定期归档旧数据。

## 相关文件清单

```
app/src/services/storage/
├── database.ts                # 数据库架构定义与初始化
├── databaseService.ts         # 数据库操作接口
└── CLAUDE.md                  # 本文档
```

## 变更记录 (Changelog)

### 2026-01-06
- 初始化 storage 服务文档
- 文档化数据库表结构
- 定义 DatabaseService 接口
- 添加性能优化指南

[根目录](../../../CLAUDE.md) > [app](../../) > [src](../) > **store**

# Store 模块文档

## 模块职责

Redux Toolkit 全局状态管理，负责应用所有状态的集中管理、持久化和中间件配置。

## 入口与启动

- **主文件**: `index.ts`
- **配置**: Redux Store + Redux Persist
- **初始化**: 应用启动时自动加载

## 对外接口

### Store 配置

```typescript
// app/src/store/index.ts
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware({ ... }),
  devTools: __DEV__
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Slices 列表

| Slice | 文件 | 职责 |
|-------|------|------|
| **entriesSlice** | `slices/entriesSlice.ts` | 管理生活记录条目 |
| **timelineSlice** | `slices/timelineSlice.ts` | 时间线视图状态 |
| **searchSlice** | `slices/searchSlice.ts` | 搜索状态与历史 |
| **settingsSlice** | `slices/settingsSlice.ts` | 用户设置 |
| **syncSlice** | `slices/syncSlice.ts` | 同步队列管理 |
| **appSlice** | `slices/appSlice.ts` | 应用全局状态 |

## 关键依赖与配置

### 依赖项

```json
{
  "@reduxjs/toolkit": "^2.11.2",
  "redux": "^5.0.1",
  "redux-persist": "^6.0.0",
  "react-redux": "^9.2.0",
  "@react-native-async-storage/async-storage": "^2.2.0"
}
```

### 持久化配置

```typescript
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['settings', 'app'],      // 持久化设置和应用状态
  blacklist: ['entries', 'search', 'timeline', 'sync'], // 不持久化频繁变化的数据
};
```

## 数据模型

### RootState 结构

```typescript
interface RootState {
  entries: EntriesState;      // 记录条目
  timeline: TimelineState;    // 时间线视图
  search: SearchState;        // 搜索状态
  settings: SettingsState;    // 用户设置
  sync: SyncState;           // 同步队列
  app: AppReducerState;      // 应用状态
}
```

### EntriesSlice 主要 Actions

```typescript
// Async Thunks
fetchEntries({ page, limit })
createEntry(entryData)
updateEntry({ id, updates })
deleteEntry(id)
fetchEntriesByDateRange({ startDate, endDate, view })
searchEntries({ query, limit })

// Reducers
clearError()
clearEntries()
updateEntryInList(entry)
removeEntryFromList(id)
addEntryToList(entry)
```

### TimelineSlice 主要 Actions

```typescript
setCurrentView(view: TimelineView)
setCurrentDate(date: Date)
setFilters(filters: TimelineFilter)
clearFilters()
```

### SearchSlice 主要 Actions

```typescript
setQuery(query: string)
addToHistory(query: string)
clearHistory()
setFilters(filters: TimelineFilter)
```

### SettingsSlice 主要 Actions

```typescript
updateSettings(settings: Partial<UserSettings>)
updatePermission({ permission, enabled })
```

### SyncSlice 主要 Actions

```typescript
addToSyncQueue(item: SyncQueueItem)
removeFromSyncQueue(id: string)
syncAll()
updateOnlineStatus(isOnline: boolean)
```

### AppSlice 主要 Actions

```typescript
initialize()
lock()
unlock()
setError(error: string)
clearError()
```

## 测试与质量

### 测试策略

- **单元测试**: 每个 slice 的 reducers 和 selectors
- **集成测试**: Async thunks 与服务层集成
- **性能测试**: 大量数据下的状态更新性能

### 测试覆盖率

- 目标覆盖率: 85%
- 当前覆盖率: 待补充测试

### 待测试项

- [ ] entriesSlice async thunks
- [ ] timelineSlice 视图切换逻辑
- [ ] searchSlice 搜索历史管理
- [ ] settingsSlice 设置持久化
- [ ] syncSlice 同步队列逻辑
- [ ] appSlice 初始化与锁定

## 常见问题 (FAQ)

### Q: 为什么 entries 不持久化？
A: entries 数据量大且频繁变化，持久化会影响性能。数据存储在 SQLite 中，应用启动时从数据库加载。

### Q: 如何添加新的 slice？
A:
1. 在 `slices/` 目录创建新文件
2. 使用 `createSlice` 定义 reducers
3. 在 `index.ts` 中导入并添加到 `rootReducer`
4. 更新 `RootState` 类型定义

### Q: 如何调试 Redux 状态？
A:
- 使用 Redux DevTools（开发模式自动启用）
- 在代码中使用 `console.log(store.getState())`
- 使用 Redux Logger 中间件（可选）

### Q: 持久化数据在哪里存储？
A: 使用 AsyncStorage，存储在设备本地。iOS 在 Documents 目录，Android 在 SharedPreferences。

## 相关文件清单

```
app/src/store/
├── index.ts                      # Store 配置与导出
├── slices/
│   ├── entriesSlice.ts           # 记录条目管理
│   ├── timelineSlice.ts          # 时间线视图
│   ├── searchSlice.ts            # 搜索状态
│   ├── settingsSlice.ts          # 用户设置
│   ├── syncSlice.ts              # 同步队列
│   └── appSlice.ts               # 应用全局状态
└── CLAUDE.md                     # 本文档
```

## 变更记录 (Changelog)

### 2026-01-06
- 初始化 store 模块文档
- 识别 6 个核心 slices
- 文档化状态结构和主要 actions

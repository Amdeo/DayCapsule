# 云端模式前端集成设计

## 概述

为 DayCapsule 添加"云端模式"开关，让用户可以在离线模式和云端模式之间自由切换。离线模式保持现有行为（本地 SQLite），云端模式下所有数据读写走后端 API。切换时支持双向数据覆盖。

## 核心原则

- 离线优先：默认离线模式，云端是可选增强
- UI 无感知：Timeline、Editor 等组件不关心数据来源
- 切换安全：模式切换时给用户充分信息，防止数据丢失

## 架构

```
┌─────────────────────────────────┐
│           UI 层（不变）           │
│  Timeline / Editor / Settings   │
├─────────────────────────────────┤
│         entryStore（改造）        │
│  根据模式委托给不同 DataSource   │
├──────────┬──────────────────────┤
│ LocalDS  │      RemoteDS        │
│ (现有DB) │  (API Client + 缓存)  │
└──────────┴──────────────────────┘
```

## 模块设计

### 1. API Client (`app/src/services/apiClient.ts`)

基于 fetch 的 HTTP 客户端，不引入 axios。

功能：
- baseURL 从环境变量 `EXPO_PUBLIC_API_URL` 读取
- 自动附加 `Authorization: Bearer <token>` header
- 401 时自动用 refreshToken 续期，续期失败触发登出
- 统一错误格式 `{ code: string, message: string }`
- 请求超时 15s
- 媒体文件上传使用 multipart/form-data

```typescript
interface ApiClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
  uploadFile(path: string, fileUri: string, fieldName: string): Promise<{ id: string; url: string }>
}
```

Token 刷新竞态处理：使用 refresh 锁机制。第一个 401 触发 refresh 请求，后续并发的 401 排队等待 refresh 完成后用新 token 重试，避免多次 refresh 调用。

### 2. AuthStore (`app/src/store/authStore.ts`)

Zustand store，token 持久化到 MMKV。

```typescript
interface AuthState {
  user: { id: string; email: string } | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  login(email: string, password: string): Promise<void>
  register(email: string, password: string): Promise<void>
  logout(): void  // 清 token + 切 cloudMode=false + 切 LocalDS + reload entries
  refreshAuth(): Promise<boolean>
  loadAuth(): void  // 启动时从 MMKV 恢复
}
```

MMKV keys：
- `auth:token`
- `auth:refreshToken`
- `auth:user` (JSON)

### 3. DataSource 接口 (`app/src/database/dataSource.ts`)

抽象数据操作，entryStore 通过此接口访问数据。

```typescript
interface DataSource {
  getEntriesPage(filters: EntryFilters, pageSize: number, cursor?: number): Promise<Entry[]>
  getEntryCount(): Promise<number>
  addEntry(entry: Omit<Entry, 'id' | 'timestamp'>): Promise<Entry>
  updateEntry(id: string, updates: Partial<Entry>): Promise<void>
  deleteEntry(id: string): Promise<void>
  getAllTags(): Promise<string[]>
  restoreEntries(entries: Entry[]): Promise<string[]>
}
```

`EntryFilters` 类型从 `database/operations.ts` 提取到 `types/entry.ts`，供 DataSource 接口和两个实现共用。

#### LocalDataSource

包装现有 `DB.*` 函数，逻辑不变。

#### RemoteDataSource

通过 apiClient 调用后端 API：
- `getEntriesPage` → `GET /api/entries?cursor=&limit=&type=&search=&tags=`
- `addEntry` → `POST /api/entries`（含媒体文件时先 `POST /api/media/upload`，再创建 entry）
- `updateEntry` → `PUT /api/entries/:id`
- `deleteEntry` → `DELETE /api/entries/:id`
- `getAllTags` → `GET /api/tags`
- `getEntryCount` → `GET /sync/status` 的 `entryCount` 字段
- `restoreEntries` → `POST /sync/upload`（复用现有全量上传）

媒体 URI 处理：RemoteDataSource 返回的 entry 中 `media[].uri` 为远程 URL（如 `https://api.example.com/api/media/xxx`）。React Native 的 `Image` 和 `expo-av` 原生支持远程 URL，无需 UI 层改动。RemoteDS 在返回 entry 时将后端的 media ID 转换为完整的下载 URL。

缓存策略：RemoteDataSource 自身不做缓存。entryStore 已有的 entries 数组 + 游标分页机制就是缓存层。通过 `GET /sync/status` 的 hash 字段在 app 回到前台时做脏检查，hash 变化则触发 `loadEntries()` 重新拉取。

### 4. entryStore 改造

```typescript
// 新增
let activeDataSource: DataSource = localDataSource  // 默认离线

function switchDataSource(ds: DataSource) {
  activeDataSource = ds
}
```

现有方法中所有 `DB.*` 调用替换为 `activeDataSource.*`。包括 `removeBrokenRecordingEntries` 中直接调用的 `DB.deleteEntry`，也需要走 `activeDataSource`。其余逻辑（分页、过滤、内存缓存）保持不变。

### 5. 模式切换逻辑

#### 开启云端模式

```
用户打开开关
  → 检查 isAuthenticated
    → 未登录：弹出登录/注册页
    → 登录成功后继续
  → 持久化 cloudMode = 'switching' 到 MMKV（防止中断导致不一致）
  → 检查云端是否已有数据（GET /sync/status）
    → 云端已有数据：展示摘要弹窗，让用户选择覆盖方向（同关闭时的逻辑）
    → 云端无数据：上传本地数据到云端（POST /sync/upload）
  → 切换 dataSource 为 RemoteDS
  → 重新加载 entries（loadEntries）
  → 持久化 cloudMode = true
```

#### 关闭云端模式

```
用户关闭开关
  → 持久化 cloudMode = 'switching'
  → 获取双方摘要：
    - 云端：GET /sync/status → { entryCount, updatedAt }
    - 本地：DB.getEntryCount()
  → 弹窗展示：
    "云端 42 条（更新于 3月21日 14:30）
     本地 38 条
     请选择数据保留方向："
    [云端 → 本地]  [本地 → 云端]  [取消]
  → 用户选择后执行覆盖：
    - 云端→本地：GET /sync/download → 清空本地 DB → restoreEntries
    - 本地→云端：POST /sync/upload（本地数据覆盖云端）
  → 切换 dataSource 为 LocalDS
  → 重新加载 entries
  → 持久化 cloudMode = false
```

启动时恢复：app 启动时检查 MMKV 中 `cloudMode` 值，若为 `'switching'` 则提示用户"上次切换未完成"，让用户重新选择。

### 6. 登录/注册 UI

入口：设置页新增"账户"section，位于最顶部。

未登录状态：
- 显示"登录 / 注册"按钮
- 点击打开 DetailPageShell 形式的登录页

登录页：
- 邮箱输入框
- 密码输入框
- "登录"按钮 + "没有账户？注册"链接
- 注册页同理，多一个密码确认框
- 密码要求提示：8-64位，含大小写字母和数字

已登录状态：
- 显示用户邮箱
- "退出登录"按钮
- 云端模式开关

### 7. 后端需要新增的 API

```
# Entries CRUD
GET    /api/entries?cursor=&limit=&type=&search=&tags=
POST   /api/entries          (JSON body, media 字段为 media ID 数组)
PUT    /api/entries/:id
DELETE /api/entries/:id
GET    /api/tags

# 媒体文件
POST   /api/media/upload     (multipart/form-data, 返回 { id, url })
GET    /api/media/:id        (返回文件流)
DELETE /api/media/:id
```

现有 `/sync/upload`、`/sync/download`、`/sync/status` 保留，用于模式切换时的全量数据迁移。

## 新增文件清单

| 文件 | 用途 |
|------|------|
| `app/src/services/apiClient.ts` | HTTP 客户端 |
| `app/src/store/authStore.ts` | 认证状态管理 |
| `app/src/database/dataSource.ts` | DataSource 接口 + LocalDS + RemoteDS |
| `app/src/components/LoginPage.tsx` | 登录/注册页面 |

## 需要修改的文件

| 文件 | 改动 |
|------|------|
| `app/src/store/entryStore.ts` | `DB.*` 调用替换为 `activeDataSource.*` |
| `app/src/store/settingsStore.ts` | 新增 `cloudMode` 状态 |
| `app/src/components/SettingsPage.tsx` | 新增"账户"section + 云端模式开关 |
| `app/src/types/entry.ts` | `syncStatus` 字段保留，云端模式下由 RemoteDS 管理 |

## 不需要改动的文件

- Timeline、EntryCard、TextEditor、VoiceRecorder、PhotoGrid 等所有 UI 组件
- CalendarView、SearchOverlay、FilterBar 等交互组件
- backupService.ts、syncService.ts（本地备份功能保留）

## 错误处理

- 网络不可用时：云端模式下操作失败，提示"网络不可用，请检查网络连接"
- token 过期：自动刷新，刷新失败则提示重新登录并自动切回离线模式
- 媒体上传失败：entry 创建成功但媒体缺失，提示用户可稍后重试
- 模式切换中断（如 app 被杀）：下次启动时检测不一致状态，提示用户重新选择

## 实施顺序

1. 后端：新增 entries CRUD API + 媒体文件 API
2. 前端：apiClient + authStore + 登录页
3. 前端：DataSource 接口 + LocalDS + RemoteDS
4. 前端：entryStore 改造（委托给 DataSource）
5. 前端：settingsStore 新增 cloudMode + 模式切换逻辑
6. 前端：SettingsPage UI 集成（账户 section + 开关）
7. 联调测试

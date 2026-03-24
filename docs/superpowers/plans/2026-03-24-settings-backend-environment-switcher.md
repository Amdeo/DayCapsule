# Settings Backend Environment Switcher Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设置页加入可记忆的后端域名切换能力，支持 `/health` 测试连接，且在测试成功后才允许保存，并让 App 的登录态、设置、同步状态、SQLite 与媒体缓存按后端环境隔离。

**Architecture:** 在前端引入一个“后端环境”层：全局只保存当前域名与最近域名列表，所有认证、设置、同步状态使用环境前缀 key，SQLite 数据库与媒体目录也按环境 key 隔离。设置页新增一个后端连接卡片，用草稿态管理输入、测试状态与保存门禁；保存成功后执行原子化环境切换，并强制退出当前登录态。

**Tech Stack:** React Native, Expo SQLite, MMKV, Zustand, Jest, React Native Testing Library, Expo FileSystem

---

## Chunk 1: 环境建模与全局服务边界

### Task 1: 建立后端环境 key 与最近域名管理

**Files:**
- Create: `app/src/services/backendEnvironmentService.ts`
- Test: `app/src/services/__tests__/backendEnvironmentService.test.ts`
- Modify: `app/src/utils/storage.ts`

- [ ] **Step 1: 先写失败测试，锁定域名规范化与最近历史规则**

在 `app/src/services/__tests__/backendEnvironmentService.test.ts` 新增测试，至少覆盖：

- `normalizeServerUrl('https://api.example.com/')` 返回 `https://api.example.com`
- 非法 URL 会抛出或返回明确失败结果
- 历史域名列表去重
- 最近使用域名最多保留 5 个
- 当前生效域名与历史列表可读写

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npm test -- --runInBand src/services/__tests__/backendEnvironmentService.test.ts`

Expected: FAIL，原因是 `backendEnvironmentService.ts` 尚不存在

- [ ] **Step 3: 实现最小后端环境服务**

在 `app/src/services/backendEnvironmentService.ts` 中实现：

- `normalizeServerUrl(url: string): string`
- `getServerKey(url: string): string`
- `getCurrentServerUrl(): Promise<string>`
- `setCurrentServerUrl(url: string): Promise<void>`
- `getRecentServerUrls(): Promise<string[]>`
- `rememberServerUrl(url: string): Promise<void>`

建议使用：

- 全局 key：`backend:currentServerUrl`
- 全局 key：`backend:recentServerUrls`

- [ ] **Step 4: 为环境作用域补 key helper**

在 `app/src/utils/storage.ts` 附近增加不破坏现有调用的 helper，例如：

- `withScope(scope: string, key: string): string`
- 或一个轻量 scoped storage helper

目标是避免各 store 手写字符串拼接。

- [ ] **Step 5: 运行测试确认通过**

Run: `cd app && npm test -- --runInBand src/services/__tests__/backendEnvironmentService.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/services/backendEnvironmentService.ts app/src/services/__tests__/backendEnvironmentService.test.ts app/src/utils/storage.ts
git commit -m "feat(settings): add backend environment service"
```

### Task 2: 改造 API client 支持运行时切换 base URL

**Files:**
- Modify: `app/src/services/apiClient.ts`
- Test: `app/src/services/__tests__/apiClient.test.ts`
- Reference: `app/src/services/backendEnvironmentService.ts`

- [ ] **Step 1: 先写失败测试，锁定运行时读取当前后端地址**

在 `app/src/services/__tests__/apiClient.test.ts` 增加测试：

- 当存在当前环境域名时，`getApiClient()` 使用该地址
- 切换环境后，client 可重新指向新地址
- 未配置时，仍回退到 `EXPO_PUBLIC_API_URL` 或现有默认值

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npm test -- --runInBand src/services/__tests__/apiClient.test.ts`

Expected: FAIL，原因是当前 `getApiClient()` 只初始化一次固定 base URL

- [ ] **Step 3: 实现最小改造**

在 `app/src/services/apiClient.ts` 中：

- 把当前环境域名作为更高优先级来源
- 提供显式重置 client 的能力，例如 `resetApiClient()`
- 仍保留 `normalizeApiBaseURL()` 逻辑

- [ ] **Step 4: 运行测试确认通过**

Run: `cd app && npm test -- --runInBand src/services/__tests__/apiClient.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/services/apiClient.ts app/src/services/__tests__/apiClient.test.ts
git commit -m "feat(settings): make api client switchable per backend environment"
```

## Chunk 2: 环境隔离的本地数据空间

### Task 3: 让 settings/auth/sync 状态按环境前缀存储

**Files:**
- Modify: `app/src/store/settingsStore.ts`
- Modify: `app/src/store/authStore.ts`
- Modify: `app/src/store/syncStore.ts`
- Test: `app/src/store/__tests__/settingsStore.test.ts`
- Test: `app/src/store/__tests__/authStore.test.ts`
- Test: `app/src/store/__tests__/syncStore.test.ts`

- [ ] **Step 1: 先写失败测试，锁定环境前缀存储**

补测试覆盖：

- 同一 key 在不同 `serverKey` 下互不干扰
- 切换环境后 `loadAuth()` 只恢复当前环境登录态
- `settingsStore` 只读取当前环境设置
- `syncStore` 只读取当前环境同步状态

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npm test -- --runInBand src/store/__tests__/settingsStore.test.ts src/store/__tests__/authStore.test.ts src/store/__tests__/syncStore.test.ts`

Expected: FAIL，原因是 store 仍使用固定 key

- [ ] **Step 3: 实现最小环境前缀改造**

分别在三个 store 中：

- 通过当前 `serverKey` 生成 scoped key
- 避免在文件顶部缓存旧环境 key
- 保证 `logout()` 只清当前环境认证信息

- [ ] **Step 4: 运行测试确认通过**

Run: `cd app && npm test -- --runInBand src/store/__tests__/settingsStore.test.ts src/store/__tests__/authStore.test.ts src/store/__tests__/syncStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/settingsStore.ts app/src/store/authStore.ts app/src/store/syncStore.ts app/src/store/__tests__/settingsStore.test.ts app/src/store/__tests__/authStore.test.ts app/src/store/__tests__/syncStore.test.ts
git commit -m "feat(settings): scope auth settings and sync state by backend environment"
```

### Task 4: 让 SQLite 与媒体目录按环境隔离

**Files:**
- Modify: `app/src/database/sqlite.ts`
- Modify: `app/src/utils/fileSystem.ts`
- Modify: `app/src/services/photoService.ts`
- Modify: `app/src/services/voiceService.ts`
- Test: `app/src/utils/__tests__/fileSystem.test.ts`
- Test: `app/src/database/__tests__/migration.test.ts`
- Optionally Create: `app/src/services/localEnvironmentDataManager.ts`

- [ ] **Step 1: 先写失败测试，锁定环境路径与数据库命名**

补测试覆盖：

- 当前环境数据库文件名为 `MemoryCapsule-<serverKey>.db`
- 媒体目录路径包含 `environments/<serverKey>/...`
- 切换环境后路径计算随之变化

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npm test -- --runInBand src/utils/__tests__/fileSystem.test.ts src/database/__tests__/migration.test.ts`

Expected: FAIL，原因是数据库名和媒体路径仍是固定值

- [ ] **Step 3: 提取环境感知的路径解析**

在 `app/src/utils/fileSystem.ts` 中：

- 把 `MEDIA_PATHS` 从静态常量改为可按当前环境解析
- 提供 `getMediaPaths()` 或等价方法

在 `app/src/database/sqlite.ts` 中：

- 支持按当前环境生成数据库名
- 支持重置/重开数据库实例，避免单例永远指向旧库

- [ ] **Step 4: 调整依赖这些路径的服务**

在 `photoService.ts`、`voiceService.ts` 中：

- 改为走环境感知的媒体路径函数
- 保持对现有 URI 解析的兼容逻辑，不在本任务强做历史迁移

- [ ] **Step 5: 运行测试确认通过**

Run: `cd app && npm test -- --runInBand src/utils/__tests__/fileSystem.test.ts src/database/__tests__/migration.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/database/sqlite.ts app/src/utils/fileSystem.ts app/src/services/photoService.ts app/src/services/voiceService.ts app/src/utils/__tests__/fileSystem.test.ts app/src/database/__tests__/migration.test.ts
git commit -m "feat(settings): isolate sqlite and media paths by backend environment"
```

## Chunk 3: 设置页交互与环境切换流程

### Task 5: 新增后端连接测试服务与设置页草稿态

**Files:**
- Create: `app/src/services/backendConnectionService.ts`
- Test: `app/src/services/__tests__/backendConnectionService.test.ts`
- Modify: `app/src/components/settings-page/useSettingsPageController.ts`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Modify: `app/src/components/settings-page/SettingsPage.styles.ts`
- Optionally Create: `app/src/components/settings-page/SettingsBackendServerCard.tsx`

- [ ] **Step 1: 先写失败测试，锁定 `/health` 测试行为**

在 `backendConnectionService.test.ts` 中覆盖：

- 合法 URL 会请求 `<baseUrl>/health`
- 非 2xx 返回失败
- 超时或网络异常返回结构化错误

在 `SettingsPage.test.tsx` 中新增断言：

- 页面显示当前后端域名
- 点击“测试连接”时会测当前输入值
- 修改输入后旧测试成功状态失效
- 只有测试成功后“保存并切换”才启用
- 可从历史域名列表中选择

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npm test -- --runInBand src/services/__tests__/backendConnectionService.test.ts src/components/__tests__/SettingsPage.test.tsx`

Expected: FAIL，原因是连接测试服务和设置页新交互尚不存在

- [ ] **Step 3: 实现后端连接测试服务**

在 `backendConnectionService.ts` 中实现：

- `testBackendConnection(inputUrl: string): Promise<{ ok: boolean; normalizedUrl?: string; message?: string }>`

要求：

- 内部做 URL 规范化
- 只请求 `/health`
- 不依赖认证

- [ ] **Step 4: 在设置页引入草稿态**

在 `useSettingsPageController.ts` 中增加：

- `draftServerUrl`
- `testStatus`
- `testedUrl`
- `testErrorMessage`
- `recentServerUrls`
- `handleDraftServerUrlChange`
- `handleSelectRecentServerUrl`
- `handleTestServerConnection`

- [ ] **Step 5: 把设置 UI 抽成独立卡片**

推荐新增 `SettingsBackendServerCard.tsx`，避免 `SettingsPageContent.tsx` 继续膨胀。

卡片包含：

- 域名下拉输入框
- 测试连接按钮
- 连接状态展示
- 保存并切换按钮

- [ ] **Step 6: 运行测试确认通过**

Run: `cd app && npm test -- --runInBand src/services/__tests__/backendConnectionService.test.ts src/components/__tests__/SettingsPage.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/src/services/backendConnectionService.ts app/src/services/__tests__/backendConnectionService.test.ts app/src/components/settings-page/useSettingsPageController.ts app/src/components/settings-page/SettingsPageContent.tsx app/src/components/settings-page/SettingsPage.styles.ts app/src/components/settings-page/SettingsBackendServerCard.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "feat(settings): add backend connection test and server selector"
```

### Task 6: 实现原子化环境切换并强制退出登录

**Files:**
- Create: `app/src/services/localEnvironmentDataManager.ts`
- Test: `app/src/services/__tests__/localEnvironmentDataManager.test.ts`
- Modify: `app/src/store/authStore.ts`
- Modify: `app/src/components/settings-page/useSettingsPageController.ts`
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1: 先写失败测试，锁定切换副作用**

测试覆盖：

- 保存切换成功后清空当前环境登录态
- 切换后重置 API client
- 切换后 SQLite 指向新数据库
- 切换失败时旧环境保持不变

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npm test -- --runInBand src/services/__tests__/localEnvironmentDataManager.test.ts src/components/__tests__/SettingsPage.test.tsx`

Expected: FAIL，原因是切换管理器不存在

- [ ] **Step 3: 实现最小环境切换管理器**

在 `localEnvironmentDataManager.ts` 中实现 `switchBackendEnvironment(nextUrl: string)`，内部顺序：

1. 计算 `serverKey`
2. 切换当前环境持久化
3. 重置 API client
4. 关闭/重置旧 SQLite 单例
5. 打开并初始化新环境数据库
6. 清空当前环境登录态
7. 让需要重新加载的数据 store 走新环境

- [ ] **Step 4: 把保存动作接到设置页**

在 `useSettingsPageController.ts` 中增加：

- `handleSaveAndSwitchServer`

要求：

- 仅在测试成功且 `testedUrl === normalizedDraftUrl` 时允许调用
- 切换成功后显示“请重新登录”

- [ ] **Step 5: 在应用入口补 reload/rehydration 边界**

在 `_layout.tsx` 中检查：

- 启动时优先加载当前环境
- 初始化数据库时使用当前环境数据库

- [ ] **Step 6: 运行测试确认通过**

Run: `cd app && npm test -- --runInBand src/services/__tests__/localEnvironmentDataManager.test.ts src/components/__tests__/SettingsPage.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/src/services/localEnvironmentDataManager.ts app/src/services/__tests__/localEnvironmentDataManager.test.ts app/src/components/settings-page/useSettingsPageController.ts app/src/store/authStore.ts app/app/_layout.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "feat(settings): switch backend environment atomically"
```

## Chunk 4: 全量验证与文档收口

### Task 7: 全量验证与文档同步

**Files:**
- Modify: `docs/superpowers/specs/2026-03-24-settings-backend-environment-switcher-design.md`
- Modify: `docs/superpowers/plans/2026-03-24-settings-backend-environment-switcher.md`
- Verify only

- [ ] **Step 1: 运行设置链路相关测试**

Run: `cd app && npm test -- --runInBand src/components/__tests__/SettingsPage.test.tsx src/services/__tests__/apiClient.test.ts src/store/__tests__/settingsStore.test.ts src/store/__tests__/authStore.test.ts src/store/__tests__/syncStore.test.ts src/utils/__tests__/fileSystem.test.ts`

Expected: PASS

- [ ] **Step 2: 运行后端环境新服务测试**

Run: `cd app && npm test -- --runInBand src/services/__tests__/backendEnvironmentService.test.ts src/services/__tests__/backendConnectionService.test.ts src/services/__tests__/localEnvironmentDataManager.test.ts`

Expected: PASS

- [ ] **Step 3: 运行类型检查**

Run: `cd app && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 4: 运行关键手动验证**

Manual:

- 打开设置页，看到当前域名
- 输入新域名后，保存按钮禁用
- 测试连接成功后，保存按钮可用
- 保存切换后被登出
- 重新登录新后端后数据空间与旧环境隔离
- 切回旧域名时可从历史记录选择并重新测试

- [ ] **Step 5: 同步文档中的实际实现差异**

如果实现中对 `serverKey`、目录结构或 UI 命名有合理调整，回写 spec 与 plan。

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-03-24-settings-backend-environment-switcher-design.md docs/superpowers/plans/2026-03-24-settings-backend-environment-switcher.md
git commit -m "docs: close backend environment switcher task"
```

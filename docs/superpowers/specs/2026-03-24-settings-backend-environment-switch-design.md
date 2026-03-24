# Settings Backend Environment Switch Design

## 背景

当前前端已经具备：

- 设置页入口与独立内容组件，见 [`app/src/components/SettingsPage.tsx`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/settings-backend-url-test/app/src/components/SettingsPage.tsx)
- 固定 base URL 的 API client，见 [`app/src/services/apiClient.ts`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/settings-backend-url-test/app/src/services/apiClient.ts)
- 固定单实例的 MMKV 存储，见 [`app/src/utils/storage.ts`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/settings-backend-url-test/app/src/utils/storage.ts)
- 固定单实例的 SQLite 数据库 `MemoryCapsule.db`，见 [`app/src/database/sqlite.ts`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/settings-backend-url-test/app/src/database/sqlite.ts)
- 固定媒体目录根路径，见 [`app/src/utils/fileSystem.ts`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/settings-backend-url-test/app/src/utils/fileSystem.ts)

用户希望在前端增加后端域名配置，并要求：

- 在设置页可修改后端域名
- 输入控件带最近使用域名记忆，可下拉选择历史地址
- 提供“测试连接”按钮
- 测试连接只请求 `/health`
- 只有测试成功后才允许保存
- 保存后作为整个 App 的全局后端地址生效
- 保存切换到新后端后，自动清空当前登录态
- 本地缓存数据不能再按单实例共用，必须考虑后端域名切换后的隔离

这意味着本次不是一个单纯的表单功能，而是“前端环境切换”能力。

## 目标

实现一个可控的前端后端环境切换方案：

1. 用户可在设置页输入或选择历史后端域名
2. 用户可通过 `/health` 验证该地址是否可达
3. 只有当前输入值测试成功后，才允许保存并切换
4. 切换后，全局 API 请求改走新地址
5. 切换后，旧登录态立即失效
6. 本地数据库、媒体缓存、同步状态、设置等按后端域名隔离，不再共用

## 非目标

本次不覆盖以下内容：

- 测试连接时验证登录态或业务接口权限
- 服务器配置自动发现
- 同一后端下多用户独立工作区
- 跨后端环境的数据迁移
- 自动把旧环境本地数据复制到新环境

## 用户确认过的约束

以下行为已由用户明确选择：

- 测试连接只请求 `/health`
- 保存成功后，全局 API 地址切换到新域名
- 只有测试成功后才允许保存
- 切换到新后端后，自动清空当前登录态
- 最近使用域名需要记忆，并在输入控件中作为下拉候选可选

## 方案选择

### 方案 A：按后端域名做环境隔离

每个后端域名都是一个独立环境，拥有自己独立的：

- API base URL
- 登录态
- 应用设置
- 同步状态
- SQLite 数据库
- 媒体与缓存目录

优点：

- 切服务器不会串数据
- 用户能在多个测试/生产环境之间来回切换
- 风险边界清晰，容易解释和测试

这是本次采用的方案。

### 方案 B：只隔离 API 地址与登录态，本地数据库继续共用

实现更轻，但不同服务器的数据会污染同一套本地数据库和媒体缓存，不采用。

### 方案 C：按“域名 + 用户”双层环境隔离

边界更严格，但第一版复杂度明显过高，不采用。

## 总体设计

### 1. 环境模型

引入一个新的“后端环境”概念，核心标识为 `serverKey`。

`serverKey` 不是原始 URL 字符串，而是对规范化域名进行安全编码后的结果，用于：

- MMKV key 前缀
- SQLite 文件名
- 媒体目录名

同时保留规范化后的 `baseUrl` 作为真实请求地址。

逻辑结构：

```text
BackendEnvironment
├── baseUrl
├── serverKey
├── auth state
├── settings state
├── sync state
├── sqlite database
└── media/cache directories
```

### 2. 设置页交互

在现有设置页新增“后端连接”卡片，建议放在“账户” section 下。

卡片内容：

- 一个可输入、可展开历史记录的域名下拉输入框
- 一个“测试连接”按钮
- 一个状态提示区域
- 一个“保存并切换”按钮

状态流转：

- 初始：显示当前已生效的后端域名，状态为“未测试”
- 用户修改输入或选择历史域名：清除之前的测试成功状态
- 点击测试：请求 `<inputBaseUrl>/health`
- 测试成功：显示“连接成功”，解锁保存
- 测试失败：显示“连接失败”，保持保存禁用
- 点击保存并切换：
  - 校验当前输入值与最近一次成功测试值完全一致
  - 写入当前环境
  - 更新最近使用域名列表
  - 切换本地环境
  - 清空当前登录态
  - 提示用户重新登录

### 3. 历史域名记忆

维护一个最近使用域名列表：

- 只记录“成功保存并切换”的域名
- 去重
- 按最近使用时间排序
- 建议保留最近 5 个

输入框支持两种操作：

- 手动输入新域名
- 从最近使用列表中选择

无论哪种方式，只要输入值变化，就必须重新测试。

### 4. API 客户端切换

当前 [`createApiClient(baseURL)`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/settings-backend-url-test/app/src/services/apiClient.ts) 假设 base URL 是固定的。

本次需要让 API client 改为依赖“当前环境”的动态地址。

可接受实现方式：

- 每次 `getApiClient()` 时从当前环境读取 base URL
- 或在环境切换时显式重建全局 client

但必须满足：

- 保存切换后，后续登录、同步、云接口立即走新地址
- 不存在“UI 显示已切换，但请求仍打旧地址”的窗口

### 5. 本地数据隔离

#### MMKV

目前 MMKV 是单实例 `app-storage`，所有 key 共享。

本次建议调整为：

- 全局区：
  - `backend:currentServer`
  - `backend:recentServers`
- 环境区：
  - `env:<serverKey>:auth:token`
  - `env:<serverKey>:auth:refreshToken`
  - `env:<serverKey>:auth:user`
  - `env:<serverKey>:settings:*`
  - `env:<serverKey>:sync:*`

这样可以在不切换 MMKV 实例的情况下，通过 key 前缀做逻辑隔离。

#### SQLite

当前数据库文件名固定为 `MemoryCapsule.db`。

本次建议改为按环境切分数据库文件，例如：

```text
MemoryCapsule-<serverKey>.db
```

切换环境时，数据库连接要指向新的文件；如果该文件不存在，则初始化新库。

#### 媒体与缓存目录

当前媒体目录是全局固定路径。

本次建议改为按环境切分目录，例如：

```text
media/environments/<serverKey>/photos/...
media/environments/<serverKey>/voice/...
media/environments/<serverKey>/cache/...
```

这样来自不同后端的媒体、本地副本和缓存不会混用。

## 切换流程

推荐切换顺序如下：

1. 用户输入或选择后端域名
2. 规范化域名
3. 点击“测试连接”，请求 `/health`
4. 测试成功后，允许点击“保存并切换”
5. 点击保存时：
   - 再次确认当前输入值与最近一次测试成功值一致
   - 生成新环境的 `serverKey`
   - 保存当前后端域名
   - 写入最近使用域名列表
   - 清空当前登录态
   - 切换 SQLite 与媒体目录到新环境
   - 重置与旧环境相关的内存状态
6. UI 提示“已切换后端，请重新登录”

关键要求：

- 切换必须是原子性的，不允许半切换
- 失败时保留旧环境，不要出现数据库已切、API client 未切的状态

## 域名规范化规则

输入值建议做统一规范化：

- 自动去掉首尾空白
- 如果缺少协议，默认补 `https://` 或根据项目决定统一补 `http://`
- 去掉末尾多余 `/`
- `/health` 探测时统一拼成 `<baseUrl>/health`

同一地址的不同写法应落到同一个环境，例如：

- `https://api.example.com/`
- `https://api.example.com`

应被视为同一环境。

## 登录态处理

用户已明确要求：切换后端后自动清空当前登录态。

因此：

- 不保留旧环境当前会话到新环境
- 不尝试把旧 token 发给新服务端
- 保存切换完成后，直接让 `useAuthStore` 回到未登录状态

旧环境自己的登录态可以保留在对应环境 key 下，供未来再切回该域名时恢复；但本次切换后的当前会话必须清空。

## 风险与约束

### 1. 这是环境切换，不是单一设置项

如果只改 UI 不改本地存储边界，会导致不同服务器的数据混写到同一个本地数据库和媒体目录里。这是本次必须避免的核心风险。

### 2. SQLite 切换需要明确的连接生命周期

当前数据库模块存在全局连接缓存。本次实现时必须设计清楚：

- 如何关闭旧连接
- 如何打开新连接
- 何时重新跑初始化/迁移

否则切换环境后可能仍然操作旧库。

### 3. 媒体路径是隐含耦合点

照片、语音、上传队列、媒体缓存都依赖路径常量。本次不一定要一次性重写所有媒体逻辑，但至少要确保新写入路径可以按环境区分，并识别旧逻辑中的耦合点。

## 测试策略

### 1. Store / Service 测试

至少覆盖：

- 域名规范化
- 最近使用域名去重与排序
- 输入值变化后测试状态失效
- 只有测试成功后才允许保存

### 2. 设置页组件测试

至少覆盖：

- 输入新域名后可点击“测试连接”
- `/health` 成功后解锁保存
- 选择历史域名后旧测试状态失效
- 保存后触发环境切换与登录态清空

### 3. 环境切换测试

至少覆盖：

- 切换后 API client 读取新地址
- 切换后 SQLite 指向新数据库
- 切换后登录态被清空
- 不同后端域名不共用相同的本地数据空间

## 验收标准

满足以下条件即认为完成：

- 设置页新增后端域名配置与测试连接能力
- 输入控件支持最近使用域名下拉选择
- `/health` 测试成功前无法保存
- 保存后全局 API 地址切换到新域名
- 保存后当前登录态被清空
- 本地 MMKV、SQLite、媒体目录按后端域名隔离
- 针对设置页交互与环境切换补齐自动化测试

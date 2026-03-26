# Login And Account Auth Test Granularity Design

## 背景

当前 App 前端测试已经补齐了设置页基础装配、预制标签管理、标签统计、首页/编辑器/图片等一批核心覆盖，但“登录 / 账户态”相关测试仍然偏粗，主要有三个缺口：

1. `LoginPage` 目前只覆盖基础渲染、登录失败反馈、切换到注册态和最基础的提交路径，空输入、注册校验、加载态和成功回流还没有锁住
2. `SettingsPage` 的账户分区目前主要验证“能打开登录弹窗”，但未登录/已登录分支、云端模式 gating、退出登录确认和云端退出回退等页面联动仍然缺失
3. Android 真实 UI 里还没有一条专门验证“设置页进入登录页再返回”的轻量链路，账户入口的真实导航没有单独被 smoke 锁定

这轮工作不重做认证架构，也不新增真实登录 E2E，而是把“登录 / 账户态”的页面层自动化测试颗粒度拉细，并保持 `Jest` 与 `Maestro` 的职责边界清晰。

## 目标

- 为 `LoginPage` 补齐细粒度页面/控制器测试
- 为设置页账户区补齐未登录、已登录、云端 gating 和退出登录的页面联动测试
- 保留 1 条 Android `Maestro` 真实导航链路，验证设置页账户入口不会断
- 避免与现有 `authStore` 单测重复堆叠
- 为后续 implementation plan 提供可直接拆任务的场景列表和文件边界

## 非目标

- 不新增认证产品能力
- 不做真实账号登录 E2E
- 不扩展 `authStore` 的底层持久化逻辑
- 不把备份/恢复、权限、后端环境切换一并纳入本轮
- 不把这轮范围扩成完整云同步回归

## 方案比较

### 方案 A：`Jest` 页面/控制器为主，`Maestro` 只保留关键账户入口

这是推荐方案。

做法：

- `LoginPage` 和设置页账户区的分支行为主要用 `Jest + React Native Testing Library` 覆盖
- `authStore` 沿用现有单测，不在这轮大幅扩充
- `Maestro` 只新增或调整 1 条“设置页打开登录页并返回”的真实导航链路

优点：

- 稳定性高
- 覆盖页面分支效率高
- 不依赖测试账号和后端状态
- 与现有测试资产和辅助 render helper 最一致

缺点：

- 不能证明真实登录提交到后端的端到端成功链路

### 方案 B：`authStore + LoginPage + SettingsPage + Maestro` 四层一起扩

做法：

- 继续补 store、页面和 E2E 三层以上的覆盖

优点：

- 表面覆盖最完整

缺点：

- `authStore` 已有单测，继续加同类断言收益有限
- 容易把页面联动和状态迁移重复测两遍

### 方案 C：偏真实登录 E2E

做法：

- 把登录、注册、退出都尽量通过 Android 真流程验证

优点：

- 最接近线上

缺点：

- 依赖账号、网络和后端状态
- 流程脆弱，维护成本高
- 不适合这轮先补颗粒度

## 最终方案

采用方案 A。

测试固定拆成三层：

1. `Jest page/controller`
   负责 `LoginPage` 表单校验、成功/失败回流、设置页账户区显示分支、云端模式 gating 和退出登录确认
2. `Jest store`
   沿用已有 `authStore` 单测，不把这轮页面行为再次下沉到 store 层
3. `Maestro`
   只保留 1 条高价值链路：设置页进入登录页，再返回设置页

分层原则：

- 能稳定用 `Jest` 覆盖的账户场景，不上 `Maestro`
- 页面联动优先在 `LoginPage` 与 `SettingsPage` 测试里锁定
- store 不重复承接页面层分支
- `Maestro` 只验证真实入口可达，不承担真实账号提交

## 范围拆分

### 1. `LoginPage`

目标文件：

- `app/src/components/LoginPage.tsx`
- `app/src/components/login-page/LoginPageForm.tsx`
- `app/src/components/login-page/useLoginPageController.ts`
- `app/src/components/__tests__/LoginPage.test.tsx`

本次重点验证：

- 空输入和注册校验
- 登录/注册成功回流
- 失败反馈语义
- 模式切换和 loading 态

### 2. 设置页账户区

目标文件：

- `app/src/components/SettingsPage.tsx`
- `app/src/components/settings-page/SettingsPageContent.tsx`
- `app/src/components/settings-page/SettingsPageDialogs.tsx`
- `app/src/components/settings-page/useSettingsPageCloudMode.ts`
- `app/src/components/__tests__/SettingsPage.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- `app/src/components/__tests__/helpers/renderSettingsPage.tsx`

本次重点验证：

- 未登录 / 已登录显示分支
- 登录弹窗入口
- 未登录时云端模式开关的 gating
- 退出登录确认的取消 / 确认
- 云端模式下退出登录时切回离线并刷新 entries

### 3. Android 账户入口 smoke

目标文件：

- `app/.maestro/common/open-settings.yaml`
- `app/.maestro/flows/smoke/` 下新增或调整账户入口 flow

本次只验证：

- 首页进入设置
- 设置页点击“登录 / 注册”
- 登录页可见
- 返回设置页后仍在设置上下文

不在这里做真实提交。

## 细粒度场景清单

### A. `LoginPage`

#### `LG-01 空邮箱或密码时提示并阻止提交`

- 前置条件：邮箱为空、密码为空或两者为空
- 操作步骤：点击“登录”
- 预期结果：弹出“请填写邮箱和密码”，不调用 `login`

#### `LG-02 注册态密码不一致时提示并阻止提交`

- 前置条件：切到注册态，密码与确认密码不一致
- 操作步骤：点击“注册”
- 预期结果：弹出“两次输入的密码不一致”，不调用 `register`

#### `LG-03 登录成功后触发 onSuccess 并清空表单`

- 前置条件：登录接口成功
- 操作步骤：输入邮箱和密码并提交
- 预期结果：调用 `login(trimmedEmail, password)`，随后调用 `onSuccess`，输入框清空

#### `LG-04 注册成功后触发 onSuccess 并清空表单`

- 前置条件：注册接口成功
- 操作步骤：切到注册态，填写邮箱、密码、确认密码并提交
- 预期结果：调用 `register(trimmedEmail, password)`，随后调用 `onSuccess`

#### `LG-05 登录失败展示 branded feedback`

- 前置条件：登录接口抛错
- 操作步骤：提交登录
- 预期结果：调用 `showErrorFeedback(buildLoginFailedFeedback(..., false))`

#### `LG-06 注册失败展示注册语义 feedback`

- 前置条件：注册接口抛错
- 操作步骤：切到注册态后提交
- 预期结果：调用 `showErrorFeedback(buildLoginFailedFeedback(..., true))`

#### `LG-07 切换模式时确认密码清空`

- 前置条件：注册态已输入确认密码
- 操作步骤：切回登录，再切回注册
- 预期结果：确认密码字段被清空，不沿用上次值

#### `LG-08 提交过程中按钮进入 loading / disabled 状态`

- 前置条件：登录或注册请求处于 pending
- 操作步骤：点击提交
- 预期结果：按钮禁用，显示 loading 指示，不允许重复触发

### B. 设置页账户区

#### `AC-01 未登录时只显示登录入口`

- 前置条件：`isAuthenticated=false`
- 操作步骤：渲染设置页
- 预期结果：显示“登录 / 注册”，不显示邮箱、同步状态和退出登录

#### `AC-02 已登录时显示账户信息与退出入口`

- 前置条件：`isAuthenticated=true`
- 操作步骤：渲染设置页
- 预期结果：显示邮箱、“已登录”、同步状态和退出登录

#### `AC-03 点击登录入口打开登录弹窗`

- 前置条件：未登录
- 操作步骤：点击“登录 / 注册”
- 预期结果：`LoginPage` 对话框可见

#### `AC-04 未登录时打开云端模式会要求登录`

- 前置条件：未登录，`cloudMode=false`
- 操作步骤：切换云端模式开关为开
- 预期结果：打开登录弹窗，不直接执行云端模式切换

#### `AC-05 退出登录取消分支`

- 前置条件：已登录
- 操作步骤：点击“退出登录”，在确认框中点“取消”
- 预期结果：不调用 `logout`

#### `AC-06 离线模式下确认退出登录`

- 前置条件：已登录，`cloudMode=false`
- 操作步骤：点击“退出登录”，在确认框中点“退出”
- 预期结果：调用 `logout`，不额外切换 `cloudMode`

#### `AC-07 云端模式下确认退出登录`

- 前置条件：已登录，`cloudMode=true`
- 操作步骤：点击“退出登录”，在确认框中点“退出”
- 预期结果：先调用 `setCloudMode(false)` 并 reload entries，再调用 `logout`

#### `AC-08 cloudMode switching 时开关禁用`

- 前置条件：`cloudMode='switching'` 或 `isSwitchingMode=true`
- 操作步骤：渲染设置页
- 预期结果：云端模式开关禁用，避免重复触发

#### `AC-09 普通账户入口登录成功后只关闭登录弹窗`

- 前置条件：通过“登录 / 注册”入口打开登录弹窗，而不是通过云端模式 gating 拉起
- 操作步骤：触发 `onLoginSuccess`
- 预期结果：登录弹窗关闭；这条普通账户入口成功场景不要求额外断言 `enableCloudMode`

#### `AC-10 云端 gating 登录成功后关闭登录弹窗并进入云端启用流程`

- 前置条件：未登录时尝试打开云端模式，因 gating 拉起登录弹窗
- 操作步骤：触发 `onLoginSuccess`
- 预期结果：登录弹窗关闭，并调用 `enableCloudMode`

### C. Android 账户入口 smoke

#### `MA-01 设置页打开登录页并返回`

- 前置条件：未登录态 app 已启动
- 操作步骤：首页进入设置，点击“登录 / 注册”，确认登录页显示，再返回设置页
- 预期结果：登录入口真实可达，返回链路稳定

## 测试文件策略

### `LoginPage.test.tsx`

继续作为登录页主测试文件，按“校验 / 成功失败 / 模式切换 / loading”分组组织。如果体量明显变大，再在 implementation plan 中拆文件。

### `SettingsPage.test.tsx` 与账户专项测试

保留现有总装配与基础入口测试，新增 `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx` 承接认证状态分支，避免再把 `SettingsPage.test.tsx` 做成大杂烩。implementation plan 可以微调文件名，但默认以这个专项文件为边界。

### `renderSettingsPage.tsx`

继续作为账户区测试的共享 render helper，必要时补最小 mock 控制面，但不在这轮重构 helper 结构。

## Maestro 策略

这轮只保留 1 条账户入口 flow，目标是：

- 验证未登录状态下设置页能进入登录页
- 验证返回后仍处于设置页

不在 `Maestro` 中验证：

- 真实账号提交
- 登录失败反馈
- 注册流程
- 退出登录确认

这些都由 `Jest` 承担。

## 风险与约束

### 1. 登录弹窗在设置测试里当前被 mock 成简单节点

这有利于稳定验证“是否打开”，但不适合在设置测试里重复覆盖登录页内部行为，因此登录页内部细节必须留在 `LoginPage.test.tsx`。

### 2. 退出登录逻辑同时依赖 `cloudMode` 和 `loadEntries`

如果测试只断 `logout`，容易漏掉“云端模式先切回离线”的关键分支，所以账户区测试必须显式验证调用顺序：先切回离线并 reload entries，再执行 `logout`。

### 3. `LoginPage` 成功后会自动触发 `onSuccess`

在设置页上下文里，这意味着成功回调不是简单“关闭弹窗”，而是“关闭弹窗并进入 enableCloudMode 流程”，测试需要锁住这个语义。

## 验收标准

- `LoginPage` 的输入校验、成功/失败回流、模式切换和 loading 态都有自动化覆盖
- 设置页账户区的未登录 / 已登录分支、云端 gating 和退出登录确认都有自动化覆盖
- Android 账户入口 smoke 能稳定验证设置页进入登录页再返回
- 新增测试遵循“小场景、单语义”原则，不通过一个大用例混测多个分支
- 不引入真实账号依赖

## 后续衔接

这份设计确认后，implementation plan 会按以下顺序拆任务：

1. 先补 `LoginPage` 细粒度测试
2. 再补设置页账户区与共享 helper 的最小扩展
3. 最后补 1 条 Android `Maestro` 账户入口链路
4. 完成后统一执行账户相关 `Jest` 与 `Maestro` 验证

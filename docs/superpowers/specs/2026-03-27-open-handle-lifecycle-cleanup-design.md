# Open Handle Lifecycle Cleanup Design

## 状态

- 当前状态：已确认设计，待写实现计划
- 用户确认日期：2026-03-27

## 背景

当前前端全量 Jest 在测试全部通过后，仍会稳定打印一条既有警告：

```text
Jest did not exit one second after the test run has completed.
This usually means that there are asynchronous operations that weren't stopped in your tests.
```

这说明当前测试环境里仍有未清理的异步资源，但 `--detectOpenHandles` 并没有直接给出明确句柄栈，只是让整套测试更慢。现阶段如果继续盲目扩大排查范围，很容易变成到处加 afterEach / reset 的噪音修补，而不是定位真正的泄漏点。

结合代码热点，当前最可疑的是两个全局入口文件：

- [`app/_layout.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/app/_layout.tsx)
- [`app/(tabs)/index.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/app/(tabs)/index.tsx)

这里集中存在 4 类会跨测试生命周期泄漏的资源：

1. `AppState` 订阅
2. `Network` 订阅
3. `BackHandler` 订阅
4. 录音用 `setInterval`

相比 upload queue 的 retry timer，这些资源更接近“每次全量都报”的全局噪音来源，而且更适合通过页面级和 layout 级测试直接锁住清理路径。

## 目标

本轮要做的是修真实的资源生命周期问题，而不是单纯压掉 Jest 警告。

具体目标：

1. 锁住 `_layout` 卸载时一定移除 `AppState` 监听
2. 锁住 `_layout` 卸载时一定移除 `Network` 监听
3. 锁住 `HomeScreen` 的 `BackHandler` 监听在关闭或卸载时被移除
4. 锁住 `HomeScreen` 的录音轮询 `setInterval` 在 stop 和卸载路径都被清理
5. 在不扩到 upload queue 的前提下，尽量消除当前全量 Jest 的 open handles 警告

## 非目标

本次不覆盖以下范围：

- `photoUploadQueue.ts` / `voiceUploadQueue.ts` 的 retry timer
- service 层 `fetch timeout` 的 abort/clearTimeout 细节
- 为 Jest 增加统一全局 handle 诊断框架
- 通过测试配置静默压掉 open handle 警告
- 为了测试便利而重构首页或 layout 主逻辑

如果这轮完成后 open handles 仍存在，再单独开下一轮查 upload queue 或测试基础设施。

## 范围与分层

本次固定在两个入口层级：

- `RootLayout`
- `HomeScreen`

测试层级采用：

- `Jest-Page`
- `Jest-AppShell`

不引入新 E2E，不引入新全局测试基础设施。

职责边界：

- `_layout` 级测试负责全局订阅注册/卸载
- `HomeScreen` 级测试负责 `BackHandler` 和录音 timer 生命周期
- 不把 queue timer 和 service timeout 混进本轮

## 方案比较

### 方案 A：先补全局 afterEach 清理或 Jest harness reset

优点：

- 见效可能快
- 对现有代码侵入小

缺点：

- 更像掩盖症状，不是修真实泄漏
- 后续仍可能继续出现别的悬空句柄

不采用。

### 方案 B：先锁 `_layout` 和 `HomeScreen` 的真实 cleanup 路径

优点：

- 与当前最可疑代码热点高度一致
- 修的是业务资源生命周期，不是测试配置
- 容易通过现有页面测试补最小回归

缺点：

- 如果 open handles 来源不在这里，这轮可能只能收掉一部分噪音

这是本次采用的方案。

### 方案 C：直接扩大到 upload queue / service timer 全面排查

优点：

- 一次性覆盖更多来源

缺点：

- 范围过大
- 很难在一轮里证明到底哪个修复真正解决问题

本轮不采用。

## 最终方案

### 1. 目标文件

本轮只允许改这几类文件：

- `_layout` 相关测试文件
- `HomeScreen` 相关测试文件
- 如果测试暴露真实未清理问题，才改：
  - [`app/_layout.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/app/_layout.tsx)
  - [`app/(tabs)/index.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/app/(tabs)/index.tsx)

不改 queue、不改 service、不改 Jest 全局配置。

### 2. 回归策略

优先复用已有最接近真实装配的测试文件：

- [`app/__tests__/_layout.photo-upload.test.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/app/__tests__/_layout.photo-upload.test.tsx)
- [`app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts)

原因：

- 这两份文件本来就覆盖了最接近实际生命周期的 mount/unmount 场景
- 不需要新起一套更重的壳层测试基建
- 有利于把“listener/timer cleanup”放在真实装配上下文里验证

### 3. 首批回归用例

本轮首批锁定 4 条回归。

#### `OH-01` `_layout` 卸载时移除 `AppState` 监听

- 前置条件：挂载 `RootLayout`
- 操作步骤：记录 `AppState.addEventListener()` 返回的 subscription；卸载组件
- 预期结果：调用 `subscription.remove()`
- 风险点：测试结束后残留全局 AppState 监听

#### `OH-02` `_layout` 卸载时移除 `Network` 监听

- 前置条件：挂载 `RootLayout`
- 操作步骤：记录 `Network.addNetworkStateListener()` 返回的 subscription；卸载组件
- 预期结果：调用 `subscription.remove()`
- 风险点：测试结束后残留网络监听

#### `OH-03` `HomeScreen` 的 `BackHandler` 在关闭或卸载时移除

- 前置条件：使 drawer 处于打开状态
- 操作步骤：触发关闭或直接卸载页面
- 预期结果：调用 `BackHandler.addEventListener()` 返回对象的 `remove()`
- 风险点：页面虽然关闭了，但 Android back 监听仍挂着

#### `OH-04` 录音 timer 在 stop 和卸载路径都被清理

- 前置条件：构造正在录音状态并建立 `recordingTimerRef`
- 操作步骤：走 stop 路径，或卸载 `HomeScreen`
- 预期结果：`clearInterval()` 被调用，并且 timer ref 被置空
- 风险点：测试结束后残留 interval，导致 Jest 无法退出

### 4. 允许的最小生产修复

如果新增回归已经证明 cleanup 路径存在，就只保留测试，不动生产代码。

只有当测试明确暴露真实缺口时，才允许做最小生产修复，例如：

- effect cleanup 漏了 `subscription.remove()`
- 某条 stop 路径漏了 `clearInterval()`
- ref 清理顺序不对，导致 interval 存活

不允许的做法：

- 为了通过测试把 cleanup 搬到不真实的路径
- 加全局 `afterEach(jest.clearAllTimers)` 来掩盖真实问题
- 顺手重构整页逻辑

### 5. 验证方式

实现阶段验证顺序固定为：

1. 先跑新增的 targeted `_layout` / `HomeScreen` 回归
2. 再跑 `npm test -- --runInBand --detectOpenHandles`
3. 最后跑前端全量 Jest

判定标准：

- 新增 cleanup 回归必须通过
- `--detectOpenHandles` 至少不能比现在更差
- 如果警告消失，记录为明确收益
- 如果警告仍在，但本轮真实 cleanup 问题已修复，也要如实记录剩余范围并停止扩张

## 风险与取舍

本轮核心取舍是：

- 优先修真实 listener / timer 泄漏
- 不为了“看起来安静”去加全局测试层掩盖
- 不把范围扩大到 queue/service

这意味着本轮可能不能一次性消掉所有 open handles，但能把最可疑、最全局的资源生命周期问题先锁住，为下一轮缩小剩余范围。

## 后续扩展

如果这轮后仍有 open handles，下一批优先方向是：

1. upload queue 的模块级 retry timer
2. service 层 request timeout / abort cleanup
3. Jest 级统一 handle 诊断工具

这些都不在本轮实现范围内，只作为后续方向保留。

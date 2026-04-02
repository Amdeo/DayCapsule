# Lint And Test Hardening Design

## 背景

当前 `main` 分支的工程状态已经比较健康：全量测试通过，但仍有两类明确可优化问题。

1. `pnpm run lint` 仍然被 `entry-card` 相关样式迁移残留阻塞。
2. 少量测试仍依赖事件循环和调度细节，例如 `Promise.resolve()` 冲刷、`setTimeout(0)`、以及对实现时序的隐式假设。

这轮优化只处理这两类问题，不再扩展到更大范围的测试基础设施治理。

## 目标

本轮只完成以下两组改动：

1. 修复 `entry-card` 相关 4 个 lint 错误，恢复 `pnpm run lint` 绿灯。
2. 收口一小批高价值测试脆弱点，只限以下文件：
   - `app/src/services/__tests__/cloudSyncService.test.ts`
   - `app/src/store/__tests__/entryStore.test.ts`
   - `app/src/services/__tests__/appLifecycleService.test.ts`
   - `app/src/database/__tests__/operations.test.ts`

## 非目标

- 不做大范围 NativeWind 迁移。
- 不修改 `entry-card` 之外的样式体系。
- 不继续扩展到其他尚未点名的测试文件。
- 不改变业务行为，只做样式落标和测试稳定性治理。

## 方案对比

### 方案 A：只修 lint

优点：范围最小，回报直接。

缺点：会把已经识别出的高价值测试脆弱点继续留在当前分支，后续仍可能产生无害重构误伤或时序型假红。

### 方案 B：先修 lint，再顺手收口一小批已定位的测试脆弱点

优点：在保持范围可控的前提下，同时恢复静态检查基线，并继续降低测试噪音。

缺点：会触碰少量测试文件，需要重新做一次回归验证。

### 方案 C：扩大成一轮完整的测试基础设施治理

优点：最彻底。

缺点：明显超出本轮目标，容易再次扩散成较大的工程任务。

推荐采用方案 B。

## 设计

### 1. `entry-card` 样式迁移收口

只处理当前 lint 明确报错的 3 个文件：

- `app/src/components/entry-card/EntryCard.styles.ts`
- `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
- `app/src/components/entry-card/EntryCardDefaultContent.tsx`

目标是把当前违反规则的 `StyleSheet.create` 和静态内联 style 转成与现有约束兼容的写法，优先遵循仓库当前规则：

- 默认改用 `className` / NativeWind
- 若某个样式确实属于运行时驱动或动画样式，仅保留必要的动态 style

这一部分不追求统一所有历史写法，只消除当前阻塞 lint 的 4 个错误。

### 2. 测试脆弱点小范围收口

只处理 4 个已点名文件，并按相同原则修正：

- 能等可观察结果，就不靠微任务/事件循环猜测。
- 能控制显式条件，就不靠 `setTimeout(0)` 或固定层数 `Promise.resolve()`。
- 如果某段延迟本身就是产品语义，则优先通过明确状态、调用次数或最终结果验证，而不是赌调度顺序。

#### `cloudSyncService.test.ts`

当前高风险点是使用 `setTimeout(resolve, 0)` 让首个同步进入进行中状态。计划改成显式 deferred/条件等待，让并发测试依赖“首个同步已在飞行中”这个可观察状态，而不是依赖事件循环切片。

#### `entryStore.test.ts`

本轮只处理仍残留的 `Promise.resolve()` 冲刷点，不扩大到整份文件的测试重写。目标是把这些位置改成更清晰的状态收敛等待，和上一轮已处理的竞态测试保持一致风格。

#### `appLifecycleService.test.ts`

当前存在通过 `Promise.resolve()` 推进异步初始化的写法。本轮会改成等待明确的回调、副作用或 mock 调用完成，而不是依赖一层微任务刚好跑完。

#### `operations.test.ts`

仅处理目前 grep 到的 `Promise.resolve()` 冲刷点，改成更明确的行为等待，不扩大到数据库测试整体重构。

## 文件级改动预期

- Modify: `app/src/components/entry-card/EntryCard.styles.ts`
- Modify: `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
- Modify: `app/src/components/entry-card/EntryCardDefaultContent.tsx`
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
- Modify: `app/src/store/__tests__/entryStore.test.ts`
- Modify: `app/src/services/__tests__/appLifecycleService.test.ts`
- Modify: `app/src/database/__tests__/operations.test.ts`

如实现过程中发现某个测试更适合通过现有 helper 调整等待方式，也允许修改对应 helper，但前提是仍然服务于这 4 个文件，不扩散到其他测试域。

## 风险与控制

### 风险 1：样式迁移影响现有布局表现

控制方式：

- 只改 lint 明确报错的位置。
- 不重写组件结构。
- 优先保持原有视觉语义，仅替换实现方式。

### 风险 2：测试从“快 flush”改成“明确等待”后暴露真实竞态

控制方式：

- 先跑目标文件，确认问题是测试写法还是行为回归。
- 每个测试只做最小收口，不顺手批量重构。
- 若暴露真实行为问题，按 bug 处理，而不是把测试压回去。

### 风险 3：范围扩散

控制方式：

- 只改已明确点名的 7 个文件。
- 不扩到其他尚未确认的测试脆弱点。
- 每完成一组改动就做针对性验证。

## 验证

本轮完成后至少执行：

1. `pnpm run lint`
2. 目标测试文件定向运行
3. `pnpm test --runInBand`

如涉及异步等待/句柄问题回归，还应追加：

4. `pnpm test --runInBand --detectOpenHandles --openHandlesTimeout=3000`

## 实施原则

- 先恢复 lint 基线，再做测试脆弱点收口。
- 测试治理优先最小正确改动。
- 避免把“治理测试”变成“重写测试体系”。
- 保持这轮成果可以独立提交与回滚。

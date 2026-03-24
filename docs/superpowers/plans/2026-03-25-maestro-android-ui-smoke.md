# Maestro Android UI Smoke Tests Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Android 原生构建的 DayCapsule app 增加一组可重复执行的 Maestro UI 冒烟测试，覆盖首页到统计页、设置页、标签管理页以及设置后端卡片的关键入口。

**Architecture:** 先补最少量的稳定 `testID`，把侧边栏和设置页关键入口变成 Maestro 可依赖的 `id` 选择器；再在 `app/.maestro/` 下搭建公共子 flow、场景 flow 和运行说明，并用 Android 模拟器实际执行验证。测试策略优先使用 `id` + `assertVisible`，只在页面切换处使用少量 `extendedWaitUntil`，避免引入网络、权限和媒体依赖。

**Tech Stack:** React Native, Expo run:android, Maestro YAML flows, Jest, React Native Testing Library

---

## Chunk 1: 补齐稳定测试锚点

### Task 1: 为侧边栏菜单项补 `testID`

**Files:**
- Modify: `app/src/components/sidebar/SidebarPanel.tsx`
- Test: `app/src/components/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定新增菜单项锚点**

在 `app/src/components/__tests__/Sidebar.test.tsx` 中新增断言，至少覆盖：

- 统计菜单项存在 `testID="sidebar-menu-stats"`
- 设置菜单项存在 `testID="sidebar-menu-settings"`
- 标签管理菜单项存在 `testID="sidebar-menu-tags"`

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/Sidebar.test.tsx --runInBand`

Expected: FAIL，原因是 `SidebarPanel.tsx` 目前还没有这些 `testID`

- [ ] **Step 3: 实现最小改动**

在 `app/src/components/sidebar/SidebarPanel.tsx` 给菜单项 `TouchableOpacity` 增加稳定 `testID`，建议基于 `item.action` 生成：

- `sidebar-menu-stats`
- `sidebar-menu-settings`
- `sidebar-menu-tags`
- 其他菜单项也可统一采用 `sidebar-menu-<action>`，保持规则一致

- [ ] **Step 4: 运行测试确认通过**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/Sidebar.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/sidebar/SidebarPanel.tsx app/src/components/__tests__/Sidebar.test.tsx
git commit -m "test(ui): add stable sidebar menu test ids"
```

### Task 2: 为设置页“预制标签管理”入口补稳定锚点

**Files:**
- Modify: `app/src/components/settings-page/SettingRow.tsx`
- Modify: `app/src/components/settings-page/SettingsPageContent.tsx`
- Test: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定设置页入口锚点**

在 `app/src/components/__tests__/SettingsPage.test.tsx` 新增断言：

- 设置页渲染时存在 `testID="settings-open-tag-management"`

- [ ] **Step 2: 运行测试确认失败**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx --runInBand`

Expected: FAIL，原因是当前 `SettingButton` 不支持透传 `testID`

- [ ] **Step 3: 实现最小改动**

在 `app/src/components/settings-page/SettingRow.tsx`：

- 给 `SettingButtonProps` 增加可选 `testID?: string`
- 将 `testID` 透传到根 `Pressable`

在 `app/src/components/settings-page/SettingsPageContent.tsx`：

- 给“预制标签管理”按钮传入 `testID="settings-open-tag-management"`

- [ ] **Step 4: 运行测试确认通过**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/SettingsPage.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/settings-page/SettingRow.tsx app/src/components/settings-page/SettingsPageContent.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "test(ui): add stable settings tag management test id"
```

## Chunk 2: 新增 Maestro flows 与说明文档

### Task 3: 搭建 `.maestro` 目录与公共 flow

**Files:**
- Create: `app/.maestro/README.md`
- Create: `app/.maestro/common/open-sidebar.yaml`
- Create: `app/.maestro/common/open-settings.yaml`
- Verify: `app/.maestro/common/open-sidebar.yaml`
- Verify: `app/.maestro/common/open-settings.yaml`

- [ ] **Step 1: 先写 README 草稿，固定目录结构和执行前提**

在 `app/.maestro/README.md` 写清：

- app 包名：`com.memorycapsule.app`
- 运行前提：Android 模拟器已启动，且已执行 `cd app && npm run android`
- 单条执行命令
- 批量执行命令
- 首批覆盖范围

- [ ] **Step 2: 编写公共 flow**

在 `app/.maestro/common/open-sidebar.yaml` 中实现：

- 断言 `searchbar-menu-button` 可见
- 点击 `searchbar-menu-button`
- 等待 `sidebar-shell` 可见

在 `app/.maestro/common/open-settings.yaml` 中实现：

- `runFlow` 调用 `open-sidebar.yaml`
- 点击 `sidebar-menu-settings`
- 等待 `settings-page-root` 可见

- [ ] **Step 3: 校验 flow 语法**

Run: 使用 Maestro 语法校验工具分别检查两个 YAML 文件

Expected: 两个文件都通过语法校验

- [ ] **Step 4: Commit**

```bash
git add app/.maestro/README.md app/.maestro/common/open-sidebar.yaml app/.maestro/common/open-settings.yaml
git commit -m "test(ui): scaffold maestro smoke test workspace"
```

### Task 4: 编写 4 条 Android smoke flow

**Files:**
- Create: `app/.maestro/flows/smoke/home-to-stats.yaml`
- Create: `app/.maestro/flows/smoke/home-to-settings.yaml`
- Create: `app/.maestro/flows/smoke/settings-to-tag-management.yaml`
- Create: `app/.maestro/flows/smoke/settings-backend-card-visible.yaml`
- Reference: `app/.maestro/common/open-sidebar.yaml`
- Reference: `app/.maestro/common/open-settings.yaml`

- [ ] **Step 1: 先按设计写 4 条 flow**

约束：

- 每条 flow 顶部都显式设置 `appId: com.memorycapsule.app`
- 使用 `launchApp` 启动，必要时用 `clearState: false`
- 优先使用 `id` 选择器
- 页面切换点优先 `assertVisible`，必要时再加 `extendedWaitUntil`

4 条 flow 目标：

- `home-to-stats.yaml`
  - 启动 app
  - 打开侧边栏
  - 点击 `sidebar-menu-stats`
  - 断言 `stats-page-root`
  - 点击 `detail-page-back-button`
  - 断言首页菜单按钮重新可见

- `home-to-settings.yaml`
  - 启动 app
  - 进入设置页
  - 断言 `settings-page-root`
  - 返回首页

- `settings-to-tag-management.yaml`
  - 启动 app
  - 进入设置页
  - 点击 `settings-open-tag-management`
  - 断言 `tag-management-root`
  - 返回设置页
  - 返回首页

- `settings-backend-card-visible.yaml`
  - 启动 app
  - 进入设置页
  - 断言 `settings-backend-card`
  - 断言 `settings-backend-input`
  - 断言 `settings-backend-test-button`
  - 断言 `settings-backend-save-button`

- [ ] **Step 2: 校验 4 条 flow 语法**

Run: 使用 Maestro 语法校验工具检查 4 个 YAML 文件

Expected: 全部通过

- [ ] **Step 3: Commit**

```bash
git add app/.maestro/flows/smoke/home-to-stats.yaml app/.maestro/flows/smoke/home-to-settings.yaml app/.maestro/flows/smoke/settings-to-tag-management.yaml app/.maestro/flows/smoke/settings-backend-card-visible.yaml
git commit -m "test(ui): add android maestro smoke flows"
```

## Chunk 3: Android 端实机验证与收尾

### Task 5: 在 Android 模拟器上执行 smoke flow

**Files:**
- Verify: `app/.maestro/flows/smoke/home-to-stats.yaml`
- Verify: `app/.maestro/flows/smoke/home-to-settings.yaml`
- Verify: `app/.maestro/flows/smoke/settings-to-tag-management.yaml`
- Verify: `app/.maestro/flows/smoke/settings-backend-card-visible.yaml`

- [ ] **Step 1: 确认 Android 设备与 app 可用**

Run:

- 使用 Maestro 设备列表工具确认有 Android 模拟器
- 如未启动，则启动 Android 模拟器
- 确认 `com.memorycapsule.app` 已安装

Expected: 存在可执行 flow 的 Android 设备，且 app 已安装

- [ ] **Step 2: 单条执行 smoke flow 并修正必要时序**

按以下顺序单独运行并观察失败点：

1. `home-to-settings.yaml`
2. `home-to-stats.yaml`
3. `settings-backend-card-visible.yaml`
4. `settings-to-tag-management.yaml`

若失败：

- 优先调整 `id` 选择器
- 其次在切页处补 `extendedWaitUntil`
- 不要引入固定长 `wait`

- [ ] **Step 3: 批量执行 smoke 目录**

Run: 执行 `app/.maestro/flows/smoke` 目录下全部 flow

Expected: 全部通过

- [ ] **Step 4: 回归 Jest 测试**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/Sidebar.test.tsx src/components/__tests__/SettingsPage.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/.maestro app/src/components/sidebar/SidebarPanel.tsx app/src/components/settings-page/SettingRow.tsx app/src/components/settings-page/SettingsPageContent.tsx app/src/components/__tests__/Sidebar.test.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "test(ui): verify android maestro smoke coverage"
```

## 执行提示

- 若 Maestro MCP 文档查询因环境变量缺失不可用，直接参考官方文档并继续实现，不要阻塞编码。
- 若 Android 模拟器未预启动，可以用 Maestro 设备工具启动；若 app 未安装，则复用现有 `cd app && npm run android` 流程。
- 若某条 flow 因当前环境初始页状态与预期不一致而失败，优先通过更稳定的返回和断言收敛，不要引入坐标点击。

Plan complete and saved to `docs/superpowers/plans/2026-03-25-maestro-android-ui-smoke.md`. Ready to execute.

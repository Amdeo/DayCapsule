# Maestro Android UI Tests

这组 Maestro flow 面向 Android 原生构建的 MemoryCapsule app，当前包含 `smoke` 和 `cloud-sync` 两组回归。

## 运行前提

- 已启动 Android 模拟器
- 已安装 Maestro
- 已在 `app/` 目录执行过 `npm run android`
- Android 包名为 `com.memorycapsule.app`
- 真实后端 happy path 需要测试账号已登录
- `happy-path-restore` 需要云端已有至少 1 条包含图片的记录
- 如需跑异常媒体场景，启动 app 前显式开启 `E2E Sync Lab`：

```bash
cd app
EXPO_PUBLIC_E2E_SYNC_LAB=1 npm run android
```

> `EXPO_PUBLIC_E2E_SYNC_LAB` 是 app 端开关，不是 Maestro 变量。它需要在启动 Android dev build 前注入。

## 目录结构

```text
app/.maestro/
  README.md
  env/
    android-dev.yaml
  common/
    launch-app.yaml
    open-sidebar.yaml
    open-settings.yaml
    open-sync-status.yaml
    open-e2e-sync-lab.yaml
    clear-e2e-sync-fixture.yaml
  flows/
    cloud-sync/
      happy-path-restore.yaml
      status-from-settings.yaml
      suspect-media.yaml
      repair-confirm.yaml
      repair-later.yaml
    smoke/
      home-to-stats.yaml
      home-to-settings.yaml
      settings-to-tag-management.yaml
      settings-backend-card-visible.yaml
```

## 单条执行

```bash
maestro test app/.maestro/flows/smoke/home-to-settings.yaml
```

云同步 happy path：

```bash
maestro test app/.maestro/flows/cloud-sync/status-from-settings.yaml
maestro test app/.maestro/flows/cloud-sync/happy-path-restore.yaml
```

异常场景：

```bash
maestro test app/.maestro/flows/cloud-sync/suspect-media.yaml
maestro test app/.maestro/flows/cloud-sync/repair-later.yaml
maestro test app/.maestro/flows/cloud-sync/repair-confirm.yaml
```

如果当前不在 app 前台，先在 `app/` 目录重新执行一次：

```bash
npm run android
```

## 批量执行

```bash
maestro test app/.maestro/flows/smoke
maestro test app/.maestro/flows/cloud-sync
```

## 当前覆盖

- 首页打开侧边栏后进入统计页
- 首页打开侧边栏后进入设置页
- 设置页进入预制标签管理
- 设置页展示后端连接卡片及关键控件
- 设置页打开同步状态弹窗并查看基础统计
- 通过 `E2E Sync Lab` 注入 suspect / repairable / repair pending 场景
- 验证异常媒体修复提示可从测试入口和同步状态弹窗拉起

## 选择器约定

- 优先使用 React Native `testID` 映射出的 Maestro `id`
- `smoke` flow 继续保持轻量导航回归
- `common/launch-app.yaml` 在 Android dev build 下只负责确认 app 已经进入首页；实际拉起仍建议先执行 `npm run android`
- 真实后端 flow 依赖账号状态和服务端测试数据；注入型 flow 只改本地状态，并通过 `clear-e2e-sync-fixture.yaml` 清理
- 侧边栏入口使用 `searchbar-menu-button-pressable`，避免点击落在不可交互的内部视图上

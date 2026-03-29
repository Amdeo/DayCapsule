# Maestro Android UI Tests

这组 Maestro flow 面向 Android 原生构建的 MemoryCapsule app，当前包含 `smoke`、`app-core` 和 `cloud-sync` 三组回归。

## 运行前提

- 已启动 Android 模拟器
- 已安装 Maestro
- 已在 `app/` 目录执行过 `npm run android`
- Android 包名为 `com.memorycapsule.app`
- `app-core` / `cloud-sync` 默认面向 Android dev build；本地验证时建议直接使用已确认可用的 `emulator-5554`
- `app-core` 整组批量执行默认要求带 `E2E Sync Lab` 的 Android dev build，因为其中的 `editor-unsaved-leave-guard`、`timeline-open-detail`、`image-viewer-back-navigation`、`settings-repair-prompt` 会自行注入稳定 fixture
- 真实后端 happy path 需要测试账号已登录
- `happy-path-restore` 需要云端已有至少 1 条包含图片的记录
- `editor-unsaved-leave-guard` 会先通过 `E2E Sync Lab` 注入稳定 text fixture，再从搜索结果左滑进入编辑器
- `timeline-open-detail` 会先通过 `E2E Sync Lab` 注入稳定 text fixture，再通过搜索结果打开文本详情
- `image-viewer-back-navigation` 会先通过 `E2E Sync Lab` 注入稳定 photo fixture，再通过搜索结果打开 ImageViewer
- `settings-repair-prompt` 会先通过 `E2E Sync Lab` 注入 suspect fixture，再验证修复提示可再次拉起
- `search-enter-exit` 只依赖当前可见 UI，不要求预置记录
- `home-open-settings-and-back` 只依赖当前可见 UI，不要求预置记录
- `settings-sync-status-open` 需要当前设备上已有登录态，因为“同步状态”入口只在已登录时显示
- 如需跑异常媒体场景，启动 app 前显式开启 `E2E Sync Lab`：

```bash
cd app
EXPO_PUBLIC_E2E_SYNC_LAB=1 npm run android
```

> `EXPO_PUBLIC_E2E_SYNC_LAB` 是 app 端开关，不是 Maestro 变量。它需要在启动 Android dev build 前注入。
>
> `app-core` 中凡是依赖固定 fixture 的 flow 都会使用设置页里的 `E2E Sync Lab` 按钮自准备数据，不再依赖首页当前首条记录。

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
    open-search-overlay.yaml
    open-first-entry.yaml
    open-entry-editor.yaml
    clear-e2e-sync-fixture.yaml
  scripts/
    run-app-core.sh
  flows/
    app-core/
      timeline-open-detail.yaml
      home-open-settings-and-back.yaml
      editor-unsaved-leave-guard.yaml
      search-enter-exit.yaml
      image-viewer-back-navigation.yaml
      settings-sync-status-open.yaml
      settings-repair-prompt.yaml
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
      settings-to-login.yaml
      settings-backend-card-visible.yaml
```

## 单条执行

以下命令均从 `app/` 目录执行。

```bash
maestro test .maestro/flows/smoke/home-to-settings.yaml
maestro test .maestro/flows/smoke/settings-to-login.yaml
```

`settings-to-login.yaml` 前置条件为未登录态 app 已启动，建议单条执行，不要和其他 smoke flow 混跑。

云同步 happy path：

```bash
maestro test .maestro/flows/cloud-sync/status-from-settings.yaml
maestro test .maestro/flows/cloud-sync/happy-path-restore.yaml
```

app core：

```bash
maestro test .maestro/flows/app-core/search-enter-exit.yaml
maestro test .maestro/flows/app-core/home-open-settings-and-back.yaml
maestro test .maestro/flows/app-core/settings-sync-status-open.yaml
maestro test .maestro/flows/app-core/timeline-open-detail.yaml
maestro test .maestro/flows/app-core/editor-unsaved-leave-guard.yaml
maestro test .maestro/flows/app-core/image-viewer-back-navigation.yaml
maestro test .maestro/flows/app-core/settings-repair-prompt.yaml
```

单独验证编辑器未保存离开确认：

```bash
cd app && maestro test .maestro/flows/app-core/editor-unsaved-leave-guard.yaml
```

先启动带 `E2E Sync Lab` 的 app-core 推荐命令：

```bash
cd app
ANDROID_HOME=/Users/cooper/Library/Android/sdk \
ANDROID_SDK_ROOT=/Users/cooper/Library/Android/sdk \
EXPO_PUBLIC_E2E_SYNC_LAB=1 \
npm run android
```

异常场景：

```bash
maestro test .maestro/flows/cloud-sync/suspect-media.yaml
maestro test .maestro/flows/cloud-sync/repair-later.yaml
maestro test .maestro/flows/cloud-sync/repair-confirm.yaml
```

本任务拆分后的专项回归命令：

```bash
maestro test .maestro/flows/app-core/settings-sync-status-open.yaml
maestro test .maestro/flows/app-core/settings-repair-prompt.yaml
maestro test .maestro/flows/cloud-sync/suspect-media.yaml
maestro test .maestro/flows/cloud-sync/repair-later.yaml
maestro test .maestro/flows/cloud-sync/repair-confirm.yaml
maestro test .maestro/flows/app-core/image-viewer-back-navigation.yaml
```

如果当前不在 app 前台，先在 `app/` 目录重新执行一次：

```bash
npm run android
```

## 批量执行

```bash
cd app && bash .maestro/scripts/run-app-core.sh
maestro test app/.maestro/flows/cloud-sync
```

`run-app-core.sh` 默认只跑无登录前置的 6 条 app-core flow；`settings-sync-status-open.yaml` 保留为单条已登录专项回归，需要在设备已登录后单独执行：

```bash
maestro test .maestro/flows/app-core/settings-sync-status-open.yaml
```

如果直接在 `app/` 目录执行 package scripts：

```bash
npm run test:frontend:settings
npm run test:frontend:home
npm run test:frontend:editor-image
npm run test:maestro:app-core
```

## 当前覆盖

- 首页打开侧边栏后进入统计页
- 首页打开侧边栏后进入设置页
- 设置页进入预制标签管理
- 设置页进入登录页并返回
- 设置页展示后端连接卡片及关键控件
- 首页进入搜索浮层并取消返回
- 首页打开侧边栏进入设置页并返回首页
- 通过 `E2E Sync Lab` 注入稳定 text fixture 后进入详情页
- 通过 `E2E Sync Lab` 注入稳定 text fixture 后左滑进入编辑器并触发未保存离开确认
- 通过 `E2E Sync Lab` 注入稳定 photo fixture 后打开 ImageViewer 并通过系统返回键回到首页
- 通过 `E2E Sync Lab` 注入 text detail / suspect / repair pending 场景
- 验证异常媒体修复提示可从测试入口和同步状态弹窗拉起
- 已登录态下可单独回归设置页打开同步状态弹窗

## 选择器约定

- 优先使用 React Native `testID` 映射出的 Maestro `id`
- `smoke` flow 继续保持轻量导航回归
- `app-core` flow 聚焦单条核心交互链路，每个 YAML 只保留一条主断言
- `common/launch-app.yaml` 在 Android dev build 下只负责确认 app 已经进入首页；`app-core` 批跑会在每条 flow 前通过 `adb monkey` 重新拉起 dev build
- 真实后端 flow 依赖账号状态和服务端测试数据；注入型 flow 只改本地状态，并通过 `clear-e2e-sync-fixture.yaml` 清理
- `app-core` 中需要固定记录的 flow 会先显式注入 `E2E Sync Lab` fixture，再用搜索结果定位目标记录
- 侧边栏入口优先点 `searchbar-menu-button`；`searchbar-menu-button-pressable` 只作为 fallback

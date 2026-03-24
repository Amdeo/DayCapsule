# Maestro Android Smoke Tests

这组 Maestro flow 面向 Android 原生构建的 DayCapsule app。

## 运行前提

- 已启动 Android 模拟器
- 已安装 Maestro
- 已在 app 目录执行过 `npm run android`
- Android 包名为 `com.memorycapsule.app`
- 默认假设 app 已被 `npm run android` 安装并拉起到前台

## 目录结构

```text
app/.maestro/
  README.md
  common/
    open-sidebar.yaml
    open-settings.yaml
  flows/
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

如果当前不在 app 前台，先在 `app/` 目录重新执行一次：

```bash
npm run android
```

## 批量执行

```bash
maestro test app/.maestro/flows/smoke
```

## 当前覆盖

- 首页打开侧边栏后进入统计页
- 首页打开侧边栏后进入设置页
- 设置页进入预制标签管理
- 设置页展示后端连接卡片及关键控件

## 选择器约定

- 优先使用 React Native `testID` 映射出的 Maestro `id`
- 首批 flow 不依赖网络成功、权限弹窗和媒体录制
- 当前这组 flow 不使用 `launchApp`，以兼容 Android dev build 下的实际运行方式
- 侧边栏入口使用 `searchbar-menu-button-pressable`，避免点击落在不可交互的内部视图上

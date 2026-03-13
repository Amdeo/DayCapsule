# 📱 MemoryCapsule

> 现代化生活记录应用 — 文字 / 照片 / 语音

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey)
![Expo](https://img.shields.io/badge/Expo-54-blue)

## ✨ 快速开始

### 前置条件

| 工具 | 版本要求 |
|------|---------|
| Node.js | 20+ |
| npm | 10+ |
| iOS 开发 | Xcode 15+（仅 macOS） |
| Android 开发 | Android Studio + JDK 17 |

> **注意**：本项目使用 MMKV 等原生模块，**不支持 Expo Go**，必须使用 custom dev client 或 EAS Build。

### 1. 克隆仓库

```bash
git clone https://github.com/cooper/MemoryCapsule.git
cd MemoryCapsule
```

### 2. 安装依赖

```bash
cd app
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你的配置（Sentry DSN 可选，留空则不上报错误）：

```env
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id  # 可选
EXPO_PUBLIC_APP_ENV=development
```

### 4. 启动开发服务器

需要先构建 custom dev client（首次运行）：

```bash
# iOS（需要 macOS + Xcode）
npx expo run:ios

# Android（需要 Android Studio）
npx expo run:android
```

之后可以直接启动 Metro：

```bash
npm start
```

## 🚀 技术栈

### 核心框架
- **Expo SDK 54** (React Native 0.81.5)
- **TypeScript 5.9** - 严格类型检查
- **Expo Router 6.0** - 文件系统路由

### 状态管理
- **Zustand 5.0** - 轻量级状态管理（1KB）

### 样式系统
- **NativeWind 4.0** - Tailwind CSS for React Native

### 存储方案
- **Expo SQLite v16** - 结构化数据存储（游标分页）
- **React Native MMKV v4.1.1** - 高性能 KV 存储（设置 + 备份）

### 动画
- **React Native Reanimated 4.1** - 60fps 原生动画

## 📁 项目结构

```
.
├── app/                     # Expo / React Native 应用
│   ├── app/                 # Expo Router 文件路由
│   ├── src/                 # 业务代码
│   ├── assets/              # 图片与字体
│   ├── package.json         # 应用脚本与依赖
│   └── eas.json             # EAS Build 配置
└── docs/                    # 项目文档
    ├── QUICK_REFERENCE.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── MANUAL_TEST_PLAN.md
    └── DEPLOYMENT.md
```

## 🛠️ 开发命令

```bash
# ⚠️ 所有命令必须在 app/ 目录执行
cd app

# 启动开发服务器
npm start

# iOS 模拟器
npm run ios

# Android 模拟器
npm run android

# 类型检查
npm run typecheck

# 运行测试
npm test
```

## 📦 构建 Release 版本

由于使用了 MMKV 等原生模块，必须使用 EAS Build。

### 修改包名（首次构建前）

编辑 `app/app.json`，修改为你的包名：

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.yourapp"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp"
    }
  }
}
```

### 构建命令

```bash
# 安装 EAS CLI（首次）
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 iOS（云端）
eas build --platform ios --profile production

# 构建 Android AAB（云端）
eas build --platform android --profile production

# 本地构建（需要 Xcode/Android Studio）
eas build --platform ios --profile production --local
eas build --platform android --profile production --local

# 预览版本（内部测试）
eas build --platform all --profile preview
```

**配置文件**: `app/eas.json` 已包含 development / preview / production 三种构建配置

**注意**: 仓库内不保存真实的商店提交凭据；`eas submit` 所需账号、服务账号和商店元数据需要在本地或 CI 中单独提供。

## ⚠️ 重要提示

1. **不兼容 Expo Go** - MMKV 需要原生模块，必须使用 EAS Build 或 custom dev client
2. **路径别名** - 使用 `@/src/...` 代替相对路径
3. **样式规范** - 使用 NativeWind `className`，避免 `StyleSheet`
4. **MMKV v4 API** - 使用 `createMMKV()` 工厂函数，删除用 `remove(key)`

## 📱 核心功能

- ✅ **三种记录类型** - 文字 / 照片 / 语音
- ✅ **SQLite 存储** - 游标分页（每页 20 条）+ 结构化查询
- ✅ **无限滚动 Timeline** - 下拉刷新 + 自动加载更多
- ✅ **标签系统** - AND 过滤 + 双写策略（`entries.tags` JSON + `entry_tags` 表）
- ✅ **全文搜索** - 按类型 / 日期 / 关键词过滤
- ✅ **MMKV 设置** - 卡片间距、自动备份等配置
- ✅ **数据迁移** - AsyncStorage → SQLite（幂等迁移）
- ✅ **花瓣展开菜单** - 原生动画 FAB
- ✅ **图片查看器** - 缩放 / 滑动浏览
- ✅ **TypeScript 严格模式** - 零 tsc 错误
- ✅ **自动化测试** - 当前仓库 `npm test` 可运行（65 个用例）

## 📚 文档索引

| 文档 | 说明 |
|------|------|
| [`docs/QUICK_REFERENCE.md`](docs/QUICK_REFERENCE.md) | API 用法、项目结构、开发命令、FAQ |
| [`docs/IMPLEMENTATION_SUMMARY.md`](docs/IMPLEMENTATION_SUMMARY.md) | 存储架构、设计决策、三阶段重构详情 |
| [`docs/MANUAL_TEST_PLAN.md`](docs/MANUAL_TEST_PLAN.md) | 28 个手动测试用例 |
| [`docs/SENTRY_SETUP.md`](docs/SENTRY_SETUP.md) | Sentry 错误监控配置指南 |

## 🏗️ 架构亮点

### 存储架构
- **双写策略** - `entries.tags` JSON（快速读取）+ `entry_tags` 表（关系查询）
- **游标分页** - 基于 `id` 的高效分页，避免 OFFSET 性能问题
- **幂等迁移** - AsyncStorage → SQLite 安全迁移，可重复执行

### 状态管理
- **Zustand** - 轻量级全局状态（entries、filters、settings）
- **分页加载** - `loadEntries()` 重置，`loadMore()` 追加

### 性能优化
- **MMKV** - 比 AsyncStorage 快 30 倍的 KV 存储
- **音频预加载** - 提前缓存音频文件，减少播放延迟
- **虚拟化列表** - FlatList 优化，仅渲染可见项

## 📚 参考资源

- [Expo 文档](https://docs.expo.dev/)
- [Expo Router 文档](https://docs.expo.dev/router/introduction/)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [NativeWind 文档](https://www.nativewind.dev/)
- [Expo SQLite 文档](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [React Native MMKV 文档](https://github.com/mrousavy/react-native-mmkv)

---

## 🤝 贡献

欢迎 PR 和 Issue！请确保：
- 代码通过 TypeScript 检查：`npm run typecheck`
- 测试全部通过：`npm test`

## 📄 License

[MIT](./LICENSE) © 2026 cooper

**Built with ❤️ using modern React Native stack**

# MemoryCapsule 部署文档

## 后端部署说明

当前仓库新增了专门的后端部署文档：

- [`docs/BACKEND_DEPLOYMENT.md`](/Users/cooper/Documents/code/MemoryCapsule/docs/BACKEND_DEPLOYMENT.md)

如果你要部署 Go API、SQLite、上传文件存储和 Nginx 反向代理，请优先看这份文档。

## 目录
- [环境准备](#环境准备)
- [EAS Build 构建](#eas-build-构建)
- [App Store 发布](#app-store-发布)
- [Google Play 发布](#google-play-发布)
- [版本管理](#版本管理)
- [环境变量配置](#环境变量配置)
- [回滚流程](#回滚流程)
- [故障排查](#故障排查)

---

## 环境准备

### 1. 安装 EAS CLI

```bash
pnpm install -g eas-cli
```

### 2. 登录 Expo 账号

```bash
eas login
```

### 3. 配置项目

```bash
cd app
eas build:configure
```

---

## EAS Build 构建

### 开发构建

```bash
# iOS 开发构建
eas build --profile development --platform ios

# Android 开发构建
eas build --profile development --platform android
```

### 预览构建

```bash
# iOS 预览构建(模拟器)
eas build --profile preview --platform ios

# Android 预览构建
eas build --profile preview --platform android
```

### 生产构建

```bash
# iOS 生产构建
eas build --profile production --platform ios

# Android 生产构建
eas build --profile production --platform android

# 同时构建两个平台
eas build --profile production --platform all
```

---

## Gitea 本地 Android APK

当前仓库已经提供 Gitea Actions workflow: `.gitea/workflows/android-release.yml`

用途:
- 在现有 `ubuntu-latest` runner 上执行本地 Android release 构建
- 产出未正式签名的 APK，仅用于验证 CI 构建链路

触发方式:
- 在 Gitea Actions 中手动运行 `Android Release APK`

主要步骤:
1. 安装 Node 20 和 Java 17
2. 安装 Android SDK / Build Tools / NDK
3. 运行 `pnpm install --frozen-lockfile`
4. 运行 `pnpm run typecheck`
5. 运行 `pnpm test --runInBand`
6. 运行 `pnpm exec expo prebuild --platform android --non-interactive --clean`
7. 运行 `./gradlew assembleRelease`
8. 上传 APK artifact

产物位置:
- Workflow artifact: `android-release-unsigned-apk`
- Runner 内构建路径: `app/android/app/build/outputs/apk/release/`

限制:
- 当前 runner 只有 Linux，不能本地构建 iOS
- iOS 需要单独增加 macOS + Xcode runner 后再接 workflow
- 该 APK 未正式签名，不用于商店发布

---

## App Store 发布

### 1. 准备工作

- 确保 Apple Developer 账号已激活
- 在 App Store Connect 创建应用
- 在本地或 CI 中准备 `eas submit` 所需的 Apple 账号、Team ID 和 App Store Connect 信息

### 2. 构建并提交

```bash
# 构建
eas build --profile production --platform ios

# 提交到 App Store
eas submit --platform ios
```

### 3. 在 App Store Connect 中完成

1. 登录 [App Store Connect](https://appstoreconnect.apple.com)
2. 选择应用 → 版本信息
3. 填写版本说明、截图、隐私政策等
4. 提交审核

---

## Google Play 发布

### 1. 准备工作

- 创建 Google Play Console 账号
- 创建应用
- 生成服务账号密钥:
  1. 访问 [Google Cloud Console](https://console.cloud.google.com)
  2. 创建服务账号
  3. 下载 JSON 密钥文件
  4. 保存为 `service-account.json`(不要提交到 Git)

### 2. 提交凭据

- 生成 Google Play 服务账号 JSON 密钥
- 将密钥保存在本地安全位置，例如 `app/service-account.json`
- 不要将真实密钥提交到 Git

### 3. 构建并提交

```bash
# 构建
eas build --profile production --platform android

# 提交到 Google Play
eas submit --platform android
```

### 4. 在 Google Play Console 中完成

1. 登录 [Google Play Console](https://play.google.com/console)
2. 选择应用 → 发布 → 生产版本
3. 填写版本说明、截图等
4. 提交审核

---

## 版本管理

### 版本号规则

遵循语义化版本 (Semantic Versioning):

```
主版本号.次版本号.修订号

例如: 1.2.3
- 1: 主版本号(重大更新)
- 2: 次版本号(新功能)
- 3: 修订号(Bug 修复)
```

### 更新版本号

在 `app.json` 中更新:

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    }
  }
}
```

**注意:**
- iOS `buildNumber` 每次构建必须递增
- Android `versionCode` 每次构建必须递增
- `version` 字符串可以保持不变(如果是同一版本的重新构建)

---

## 环境变量配置

### 开发环境

复制 `.env.example` 为 `.env`:

```bash
cp .env.example .env
```

编辑 `.env`:

```env
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
EXPO_PUBLIC_APP_ENV=development
```

### 生产环境

在 EAS 构建时设置环境变量:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "your-sentry-dsn"
eas secret:create --scope project --name EXPO_PUBLIC_ENABLE_CRASH_REPORTING --value "true"
eas secret:create --scope project --name EXPO_PUBLIC_APP_ENV --value "production"
```

查看已设置的密钥:

```bash
eas secret:list
```

---

## 回滚流程

### 1. App Store 回滚

1. 登录 App Store Connect
2. 选择应用 → App Store → 版本历史
3. 选择之前的版本
4. 点击"提交审核"重新发布旧版本

### 2. Google Play 回滚

1. 登录 Google Play Console
2. 选择应用 → 发布 → 生产版本
3. 点击"创建新版本"
4. 选择之前的 APK/AAB
5. 提交发布

### 3. 紧急热修复

如果需要紧急修复:

```bash
# 1. 创建修复分支
git checkout -b hotfix/critical-bug

# 2. 修复问题并测试

# 3. 更新版本号(修订号+1)
# 编辑 app.json: "version": "1.0.1"

# 4. 构建并发布
eas build --profile production --platform all
eas submit --platform all
```

---

## 故障排查

### 构建失败

**问题:** EAS 构建失败

**解决方案:**
1. 检查构建日志: `eas build:list`
2. 常见问题:
   - 依赖版本冲突 → 检查 `package.json`
   - 原生模块配置错误 → 检查 `app.json` plugins
   - 证书问题 → 运行 `eas credentials`

### 提交失败

**问题:** 提交到商店失败

**解决方案:**

**iOS:**
- 检查 Apple ID 和 Team ID 是否正确
- 确保应用已在 App Store Connect 创建
- 检查证书是否过期: `eas credentials`

**Android:**
- 检查 `service-account.json` 路径是否正确
- 确保服务账号有发布权限
- 检查 `versionCode` 是否递增

### 应用崩溃

**问题:** 生产环境应用崩溃

**解决方案:**
1. 检查 Sentry 错误报告
2. 查看崩溃日志:
   - iOS: Xcode → Window → Devices and Simulators
   - Android: `adb logcat`
3. 如果是关键问题,立即回滚到上一版本

### 权限问题

**问题:** 相机/麦克风/照片权限不工作

**解决方案:**
1. 检查 `app.json` 中的权限配置
2. iOS: 确保 `infoPlist` 包含所有权限描述
3. Android: 确保 `permissions` 数组包含所需权限
4. 重新构建应用

---

## 发布检查清单

### 构建前
- [ ] 所有测试通过
- [ ] 代码已合并到 main 分支
- [ ] 版本号已更新
- [ ] 发布说明已准备
- [ ] 环境变量已配置

### 构建后
- [ ] 在真机上测试构建
- [ ] 检查应用性能
- [ ] 验证所有功能正常
- [ ] 检查崩溃报告

### 提交前
- [ ] 准备应用截图(所有尺寸)
- [ ] 准备应用描述和更新说明
- [ ] 隐私政策 URL 已准备
- [ ] 支持 URL 已准备

### 提交后
- [ ] 监控审核状态
- [ ] 准备回答审核问题
- [ ] 监控 Sentry 错误报告
- [ ] 监控用户反馈

---

## 有用的命令

```bash
# 查看构建列表
eas build:list

# 查看构建详情
eas build:view [BUILD_ID]

# 取消构建
eas build:cancel [BUILD_ID]

# 查看提交状态
eas submit:list

# 查看项目配置
eas config

# 查看凭证
eas credentials

# 更新 CLI
pnpm install -g eas-cli@latest
```

---

## 联系支持

- **Expo 文档**: https://docs.expo.dev
- **EAS 文档**: https://docs.expo.dev/eas/
- **Expo 论坛**: https://forums.expo.dev
- **Discord**: https://chat.expo.dev

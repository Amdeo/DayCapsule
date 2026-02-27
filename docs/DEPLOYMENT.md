# MemoryCapsule 部署文档

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
npm install -g eas-cli
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

## App Store 发布

### 1. 准备工作

- 确保 Apple Developer 账号已激活
- 在 App Store Connect 创建应用
- 配置 `eas.json` 中的 iOS 提交信息:
  ```json
  {
    "submit": {
      "production": {
        "ios": {
          "appleId": "your-apple-id@example.com",
          "ascAppId": "1234567890",
          "appleTeamId": "ABCDE12345"
        }
      }
    }
  }
  ```

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

### 2. 配置 eas.json

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./service-account.json",
        "track": "internal"
      }
    }
  }
}
```

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
SENTRY_DSN=
APP_ENV=development
API_URL=http://localhost:3000
ENABLE_ANALYTICS=false
ENABLE_CRASH_REPORTING=false
DEBUG_MODE=true
```

### 生产环境

在 EAS 构建时设置环境变量:

```bash
eas secret:create --scope project --name SENTRY_DSN --value "your-sentry-dsn"
eas secret:create --scope project --name APP_ENV --value "production"
eas secret:create --scope project --name API_URL --value "https://api.memorycapsule.com"
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
- [ ] CHANGELOG.md 已更新
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
npm install -g eas-cli@latest
```

---

## 联系支持

- **Expo 文档**: https://docs.expo.dev
- **EAS 文档**: https://docs.expo.dev/eas/
- **Expo 论坛**: https://forums.expo.dev
- **Discord**: https://chat.expo.dev

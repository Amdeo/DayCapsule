# Quickstart – LifeLog 多模态记录

## 前置条件
- macOS 13+（可构建 iOS/Android），Xcode 15、Android Studio Iguana+
- Node.js 20 LTS、Yarn 1.22、Watchman
- React Native CLI 环境（`npx react-native doctor` 检查）
- iOS 模拟器 & Android Emulator（API 34）
- 安装 `cocoapods`（Ruby 3.1+）
- 配置腾讯云 ASR 与百度 EasyDL 凭证（本地 `.env.local`）

## 初始安装
```bash
# 安装依赖
yarn install

# iOS 依赖
yarn pod

# 生成本地配置样板
cp .env.sample .env.local
```

## 运行应用
```bash
# iOS 调试
yarn ios

# Android 调试
yarn android
```

- 首次启动按引导完成相机、麦克风、定位权限。
- 通过设置页打开“性能指标 overlay”以验证 <2 秒交互目标。

## 测试
```bash
# 单元 & 组件测试
yarn test

# Detox E2E（需模拟器已启动）
yarn detox build -c ios.sim.release
yarn detox test -c ios.sim.release
```

- 关键功能（拍照、语音、时间线、搜索）必须在 PR 中附带测试报告截图。
- 运行 `yarn lint` 与 `yarn typecheck` 保持模块化与类型安全。

## 性能基准
```bash
# 生成 10k 数据集并运行性能脚本
yarn perf:seed
yarn perf:timeline
```
- `perf:seed` 脚本向 SQLite 注入 10,000 条模拟记录。
- `perf:timeline` 输出列表渲染与搜索的 p95 响应时间；结果需 <2 秒。

## 构建产物
```bash
# Release 构建（iOS）
yarn ios --configuration Release

# Release 构建（Android）
yarn android --variant release
```
- 构建时需提供生产环境 API 凭证（离线模型引用本地文件）。
- 确保产物默认启用暗色/字体切换入口。

## 常见问题
- **权限被拒绝**：在设置页二次引导，UI 允许手动补录地点/天气。
- **磁盘空间不足**：上传前触发空间检测，提示用户清理或导出。
- **ASR 转写失败**：离线仍保存音频，网络恢复后自动重试并在通知中心提示结果。

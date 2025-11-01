# E2E 测试指南

本文档说明如何运行 MemoryCapsule 应用的端到端 (E2E) 测试。

## 概述

E2E 测试使用 **Detox** 框架进行，可以在 iOS 和 Android 模拟器上运行。

### 测试文件位置

```
app/e2e/
├── homeScreen.test.ts          # 主屏幕测试
├── photoCapture.test.ts        # 拍照功能测试
├── voiceRecording.test.ts       # 语音录制测试
├── tagsAndMood.test.ts         # 标签和心情功能测试
├── jest.config.js              # Jest 配置
└── starter.test.ts             # 示例测试
```

## 前置条件

### 1. 安装 Detox CLI

```bash
npm install -g detox-cli
```

### 2. 安装依赖

```bash
cd app
npm install
```

### 3. 配置 Detox

Detox 配置文件已在 `app/.detoxrc.json` 中设置。

## 运行 E2E 测试

### iOS 测试

#### 第一次运行（需要构建）

```bash
npm run test:e2e:build:ios
npm run test:e2e:ios
```

#### 后续运行（使用已构建的应用）

```bash
npm run test:e2e:ios
```

### Android 测试

#### 第一次运行（需要构建）

```bash
npm run test:e2e:build:android
npm run test:e2e:android
```

#### 后续运行（使用已构建的应用）

```bash
npm run test:e2e:android
```

## 测试覆盖范围

### 1. 主屏幕测试 (homeScreen.test.ts)

- ✅ 验证主屏幕显示
- ✅ 验证 FAB 按钮存在（拍照、语音、文字）
- ✅ 打开文字记录对话框
- ✅ 创建文字记录
- ✅ 查看所有记录列表
- ✅ 导航到记录详情页

### 2. 拍照功能测试 (photoCapture.test.ts)

- ✅ 打开拍照对话框
- ✅ 创建带描述和标签的照片记录
- ✅ 在列表中显示照片缩略图
- ✅ 查看照片详情
- ✅ 编辑照片记录
- ✅ 删除照片记录

### 3. 语音录制测试 (voiceRecording.test.ts)

- ✅ 打开语音录制对话框
- ✅ 开始和停止录音
- ✅ 取消录音
- ✅ 创建语音记录
- ✅ 播放录音
- ✅ 暂停和恢复播放

### 4. 标签和心情测试 (tagsAndMood.test.ts)

- ✅ 添加单个标签
- ✅ 添加多个标签
- ✅ 删除标签
- ✅ 显示标签建议
- ✅ 选择开心心情
- ✅ 选择所有心情选项
- ✅ 取消心情选择

## testID 参考

### 主屏幕

- `home-screen` - 主屏幕容器
- `fab-photo` - 拍照按钮
- `fab-voice` - 语音按钮
- `fab-text` - 文字按钮
- `view-all-button` - 查看所有记录按钮
- `entry-list-dialog` - 记录列表对话框
- `entry-list` - 记录列表

### 对话框

- `photo-entry-dialog` - 拍照对话框
- `voice-entry-dialog` - 语音对话框
- `text-entry-dialog` - 文字对话框

### 组件

- `photo-preview` - 照片预览
- `photo-description` - 照片描述输入
- `text-input` - 文字输入
- `tag-input` - 标签输入
- `tag-add-button` - 添加标签按钮
- `tag-delete-{tag}` - 删除标签按钮
- `tag-suggestions` - 标签建议容器
- `mood-selector` - 心情选择器
- `mood-{value}` - 心情按钮（happy, excited, neutral, tired, sad）
- `mood-{value}-selected` - 选中的心情指示

### 语音录制

- `voice-recorder` - 语音录制组件
- `record-button` - 开始录音按钮
- `stop-button` - 停止录音按钮
- `cancel-button` - 取消按钮
- `recording-timer` - 录音计时器
- `recording-indicator` - 录音状态指示
- `recording-progress` - 录音进度条

### 记录列表

- `entry-item-{index}` - 记录项
- `photo-thumbnail-{index}` - 照片缩略图
- `voice-indicator-{index}` - 语音指示器

### 记录详情

- `entry-detail-screen` - 详情屏幕
- `entry-content` - 记录内容
- `detail-photo` - 详情照片
- `back-button` - 返回按钮
- `edit-button` - 编辑按钮
- `delete-button` - 删除按钮
- `save-button` - 保存按钮
- `edit-mode` - 编辑模式输入
- `delete-confirm-dialog` - 删除确认对话框
- `confirm-delete-button` - 确认删除按钮

## 故障排除

### 问题：Detox 找不到应用

**解决方案：** 确保已运行构建命令

```bash
npm run test:e2e:build:ios
```

### 问题：权限被拒绝

**解决方案：** Detox 配置已设置自动授予权限。如果仍有问题，检查 `.detoxrc.json` 中的权限设置。

### 问题：测试超时

**解决方案：** 增加 `waitFor` 的超时时间，或检查模拟器性能。

## 最佳实践

1. **运行前清理** - 在运行测试前重新加载 React Native
2. **使用 testID** - 所有可交互元素都应有唯一的 testID
3. **等待元素** - 使用 `waitFor` 等待异步操作完成
4. **模拟用户操作** - 使用 `multiTap` 和 `typeText` 模拟真实用户交互
5. **验证结果** - 使用 `expect` 验证测试结果

## 相关文档

- [Detox 官方文档](https://wix.github.io/Detox/)
- [Jest 配置](./e2e/jest.config.js)
- [Detox 配置](../.detoxrc.json)


# MemoryCapsule 📱

一个功能强大的 React Native 生活日志应用，帮助您记录和回顾美好时光。

## ✨ 核心特性

### 📸 多模态快速记录 (User Story 1)
- **≤3 次点击快速拍照** - 一键启动相机，快速保存
- **文字快记** - 支持快速输入文字备忘录
- **位置记录** - 自动记录地理位置信息
- **天气信息** - 自动获取当前天气
- **< 2 秒保存** - 高效的本地存储

### 🎤 语音转写 (User Story 2)
- **实时语音录制** - 支持长时间录音
- **自动转写** - 集成腾讯云 ASR 服务
- **离线缓存** - 网络不可用时本地缓存
- **中断处理** - 优雅处理录音中断
- **< 2 秒响应** - 快速的转写反馈

### 📅 多维时间线回顾 (User Story 3)
- **日视图** - 按小时分段显示记录
- **周视图** - 7 列点状热度指示
- **月视图** - 日历热力图展示
- **年视图** - 全年统计概览
- **虚拟滚动** - 优化大列表性能
- **一年前的今天** - 智能提醒功能

### 🔍 搜索与筛选 (User Story 4)
- **全文搜索** - FTS5 支持，< 2 秒响应
- **语义搜索** - 本地向量匹配
- **多维筛选** - 标签、心情、日期、地点组合
- **搜索建议** - 自动补全和历史记录
- **导出功能** - PDF、Word、CSV、JSON 格式

### 🤖 AI 标签建议 (User Story 7)
- **图像识别** - 百度 EasyDL TensorFlow Lite 模型
- **自动标签** - 智能识别照片内容
- **一键应用** - 快速采纳 AI 建议
- **模型更新** - 自动检查和更新模型

### 🔄 同步与数据管理 (User Story 8)
- **离线优先** - 本地优先，自动同步
- **同步队列** - 智能队列管理
- **重试机制** - 指数退避，最多 5 次
- **云备份** - 支持自动备份（占位实现）
- **空间监控** - 实时监控存储使用

### 🔒 设置与安全 (User Story 9)
- **主题切换** - 浅色/深色/自动三种主题
- **字体调节** - 小/中/大三档字体
- **生物识别** - 指纹/面部识别锁定
- **密码保护** - 密码设置和验证
- **隐私设置** - 数据收集和共享控制
- **密钥轮换** - 自动密钥轮换策略

### ♿ 无障碍支持
- **屏幕阅读器** - 完整的无障碍标签
- **语音提示** - 关键操作的语音反馈
- **高对比度** - 支持高对比度模式
- **文本摘要** - 时间线图表的文本描述

---

## 🚀 快速开始

### 前置要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- React Native 0.74
- iOS 15+ 或 Android 12+

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/MemoryCapsule.git
cd MemoryCapsule

# 安装依赖
npm install

# 安装 iOS 依赖（仅 macOS）
cd ios && pod install && cd ..

# 启动开发服务器
npm start

# 运行 iOS
npm run ios

# 运行 Android
npm run android
```

### 开发命令

```bash
# 运行测试
npm test

# 运行 linter
npm run lint

# 构建生产版本
npm run build

# 清理缓存
npm run clean
```

---

## 📊 项目结构

```
MemoryCapsule/
├── app/
│   ├── src/
│   │   ├── features/          # 功能模块
│   │   ├── services/          # 业务服务
│   │   ├── store/             # Redux 状态管理
│   │   ├── ui/                # 通用 UI 组件
│   │   └── app/               # 应用入口
│   ├── tests/                 # 测试文件
│   └── package.json
├── docs/                      # 文档
├── specs/                     # 规范和任务
└── README.md
```

---

## 🏗️ 技术栈

- **框架**: React Native 0.74
- **语言**: TypeScript 5.x
- **状态管理**: Redux Toolkit
- **导航**: React Navigation 6
- **数据库**: SQLite + FTS5
- **加密**: AES-256-GCM
- **UI 库**: React Native Paper
- **测试**: Jest + React Native Testing Library

---

## 📈 性能指标

| 指标 | 目标 | 实际 |
|------|------|------|
| 应用启动 | < 2s | 1.8s ✅ |
| 首屏加载 | < 2s | 1.5s ✅ |
| 搜索响应 | < 2s | 1.2s ✅ |
| 内存占用 | < 150MB | 120MB ✅ |
| 帧率 | > 55fps | 58fps ✅ |

详见 [性能基准报告](./docs/PERFORMANCE_BENCHMARK.md)

---

## 📚 文档

- [快速开始指南](./docs/quickstart.md)
- [Android 运行指南](./docs/ANDROID_SETUP.md)
- [运行状态报告](./docs/RUN_STATUS.md)
- [性能基准报告](./docs/PERFORMANCE_BENCHMARK.md)
- [API 文档](./docs/API.md)
- [贡献指南](./CONTRIBUTING.md)

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- timeline.test.ts

# 生成覆盖率报告
npm test -- --coverage
```

---

## 🔐 安全

- 所有数据使用 AES-256-GCM 加密存储
- 支持生物识别和密码双重认证
- 本地存储，数据不上云
- 定期密钥轮换策略

详见 [安全政策](./SECURITY.md)

---

## 📝 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

详见 [贡献指南](./CONTRIBUTING.md)

---

## 📞 联系方式

- 📧 Email: support@memorycapsule.app
- 🐦 Twitter: @MemoryCapsule
- 💬 Discord: [加入我们的社区](https://discord.gg/memorycapsule)

---

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**Made with ❤️ by MemoryCapsule Team**


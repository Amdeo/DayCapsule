# MemoryCapsule React Native App

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- React Native CLI
- iOS 模拟器或 Android 模拟器

### 安装依赖

```bash
npm install
```

### 运行应用

```bash
# 启动 Metro bundler
npm start

# 在 iOS 模拟器中运行
npm run ios

# 在 Android 模拟器中运行
npm run android
```

### 项目结构

```
app/
├── src/
│   ├── app/           # 应用入口和导航
│   ├── features/      # 功能模块
│   │   ├── capture/    # 拍照、录音、文字记录
│   │   ├── timeline/   # 时间线显示
│   │   ├── search/     # 搜索和筛选
│   │   └── settings/   # 设置界面
│   ├── services/      # 业务服务
│   │   ├── storage/    # 数据库操作
│   │   ├── ai/         # AI 服务
│   │   ├── camera/     # 相机服务
│   │   ├── voice/      # 录音服务
│   │   ├── location/   # 位置服务
│   │   └── weather/    # 天气服务
│   ├── store/         # Redux 状态管理
│   ├── ui/            # 通用 UI 组件
│   ├── types/         # TypeScript 类型定义
│   └── utils/         # 工具函数
├── __tests__/       # 测试文件
├── index.js         # 应用入口
└── package.json      # 依赖配置
```

### 技术栈

- **框架**: React Native 0.74 + TypeScript 5.x
- **状态管理**: Redux Toolkit + Redux Persist
- **导航**: React Navigation 6
- **UI**: React Native Paper
- **数据库**: SQLite + FTS5 全文搜索
- **AI**: 百度 EasyDL TensorFlow Lite
- **动画**: React Native Reanimated 3
- **手势**: React Native Gesture Handler

### 核心功能

#### ✅ 已实现

1. **数据层**
   - SQLite 数据库设计与实现
   - FTS5 全文搜索
   - 数据模型和类型定义
   - CRUD 操作和事务管理

2. **状态管理**
   - Redux Toolkit 配置
   - 6个核心 Slice (entries, timeline, search, settings, sync, app)
   - 异步操作和错误处理
   - 持久化配置

3. **AI 服务**
   - 百度 EasyDL TensorFlow Lite 集成
   - 图像识别和标签建议
   - AI 标签建议 UI 组件
   - 模型更新策略

4. **媒体服务**
   - 相机服务（拍照、相册选择、批量处理）
   - 录音服务（录制、播放、文件管理）
   - 图像压缩和缩略图生成
   - 权限管理和错误处理

5. **位置和天气服务**
   - 地理位置服务（定位、地理编码、距离计算）
   - 天气服务（当前天气、预报、缓存机制）
   - 网络状态检测

6. **UI 组件**
   - 加载指示器
   - 错误边界
   - 空状态组件
   - 主题系统（浅色/深色模式）
   - 主时间线屏幕示例

### 🚧 待完善

1. **功能界面**
   - 完整的时间线视图实现
   - 搜索和筛选界面
   - 设置界面
   - 记录创建和编辑界面

2. **测试覆盖**
   - 单元测试
   - 集成测试
   - E2E 测试

3. **后端服务**
   - 云同步功能
   - 数据备份服务
   - 用户认证系统

### 开发指南

1. **代码规范**
   - 使用 TypeScript 严格模式
   - 遵循 ESLint 规则
   - 使用 Prettier 格式化代码

2. **提交规范**
   - 使用 Conventional Commits
   - 格式: `type(scope): description`
   - 类型: feat, fix, docs, style, refactor, test, chore

3. **分支策略**
   - `main`: 生产分支
   - `develop`: 开发分支
   - `feature/*`: 功能分支

### 性能目标

- 应用启动时间 < 2 秒
- 搜索响应时间 < 2 秒
- 视图切换时间 < 2 秒
- 内存使用 < 150MB
- 帧率 > 55fps

### 故障排除

#### 常见问题

1. **Metro 启动失败**
   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS 构建失败**
   ```bash
   cd ios && pod install
   ```

3. **Android 构建失败**
   ```bash
   cd android && ./gradlew clean
   ```

### 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m "feat: add new feature"`)
4. 推送分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

---

**注意**: 这是一个基础架构实现，核心功能已经完备，可以开始开发具体的功能界面。

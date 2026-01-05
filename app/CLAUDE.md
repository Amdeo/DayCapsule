# MemoryCapsule App Module

> 📍 **导航**: [根目录](../CLAUDE.md) / **app/** | 更新时间: 2026-01-06

## 模块概述

React Native 应用主目录,包含所有源代码、配置文件和构建脚本。

### 核心职责
- 📱 React Native 0.74 应用入口
- 🎨 UI 组件和页面实现
- 🔧 构建配置和依赖管理
- 🧪 测试套件

## 目录结构

```
app/
├── src/                          # 源代码根目录
│   ├── app/                      # 应用入口和导航配置
│   ├── features/                 # 功能模块(业务领域)
│   ├── services/                 # 服务层(技术能力)
│   ├── store/                    # Redux 全局状态
│   ├── ui/                       # UI 基础设施
│   ├── types/                    # TypeScript 类型
│   ├── utils/                    # 工具函数
│   └── config/                   # 配置文件
├── android/                      # Android 原生项目
├── ios/                          # iOS 原生项目
├── __tests__/                    # 测试文件
├── index.js                      # 应用入口
├── package.json                  # 依赖管理
├── tsconfig.json                 # TypeScript 配置
├── babel.config.js               # Babel 配置
└── metro.config.js               # Metro 打包配置
```

## 主要入口文件

| 文件 | 用途 | 说明 |
|------|------|------|
| `index.js` | 应用注册 | 注册 React Native 根组件 |
| `src/app/App.tsx` | 应用根组件 | Redux Provider + Navigation |
| `src/app/navigation.tsx` | 导航配置 | React Navigation 路由 |
| `src/store/index.ts` | Store 入口 | Redux store 配置和导出 |

## 核心依赖

### 框架核心
- **react**: 18.2.0
- **react-native**: 0.74.3
- **typescript**: 5.0.4

### 状态管理
- **@reduxjs/toolkit**: ^2.11.2
- **react-redux**: ^9.2.0
- **redux-persist**: ^6.0.0

### 导航
- **@react-navigation/native**: ^7.1.26
- **@react-navigation/stack**: ^7.6.13

### UI 组件
- **react-native-paper**: ^5.14.5 (Material Design)
- **react-native-svg**: ^15.15.1

### 本地存储
- **@react-native-async-storage/async-storage**: ^2.2.0
- **react-native-sqlite-storage**: ^6.0.1

## 开发命令

所有命令必须在 `app/` 目录下执行:

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 运行 iOS
npm run ios

# 运行 Android
npm run android

# 运行测试
npm test

# 代码检查
npm run lint
```

## TypeScript 配置

### 路径别名 (tsconfig.json)

```typescript
{
  "@app/*": ["src/app/*"],
  "@features/*": ["src/features/*"],
  "@services/*": ["src/services/*"],
  "@store/*": ["src/store/*"],
  "@ui/*": ["src/ui/*"],
  "@types": ["src/types"],
  "@utils/*": ["src/utils/*"],
  "@config/*": ["src/config/*"]
}
```

### 使用示例

```typescript
// 推荐使用路径别名
import { useAppDispatch } from '@store/hooks';
import { Button } from '@ui/components';
import { Entry } from '@types';

// 避免使用相对路径
// import { useAppDispatch } from '../../store/hooks';
```

## 模块依赖关系

```
App Entry (index.js)
  └── App.tsx (Redux Provider)
      └── Navigation
          ├── Features (业务模块)
          │   ├── Capture
          │   ├── Timeline
          │   ├── Search
          │   └── Settings
          ├── Services (技术服务)
          │   ├── AI
          │   ├── Storage
          │   └── Camera
          └── UI (基础组件)
              └── Components
```

## 子模块导航

详细的模块文档:

- [app/](src/app/CLAUDE.md) - 应用入口和导航
- [features/](src/features/CLAUDE.md) - 功能模块
- [services/](src/services/CLAUDE.md) - 服务层
- [store/](src/store/CLAUDE.md) - Redux 状态管理
- [ui/](src/ui/CLAUDE.md) - UI 基础设施

## 开发规范

### 代码风格
- 使用 TypeScript strict 模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化

### 性能要求
- 所有核心操作 < 2s
- 内存占用 < 150MB
- 测试覆盖率 ≥ 70%

### 安全要求
- AES-256-GCM 加密
- 本地数据保护
- 权限最小化原则

## 常见任务

### 添加新功能模块

1. 在 `src/features/` 创建新目录
2. 创建模块的 CLAUDE.md 文档
3. 在 navigation.tsx 中注册路由
4. 在 store/slices/ 创建对应的 slice

### 添加新服务

1. 在 `src/services/` 创建新目录
2. 实现服务接口
3. 在需要的模块中导入使用

### 添加新 UI 组件

1. 在 `src/ui/components/` 创建组件
2. 导出到 index.ts
3. 添加类型定义

## 相关文档

- [架构设计](../agent_docs/01-architecture.md)
- [编码规范](../agent_docs/04-coding-standards.md)
- [测试策略](../agent_docs/05-testing-strategy.md)
- [目录结构](../agent_docs/08-directory-structure.md)

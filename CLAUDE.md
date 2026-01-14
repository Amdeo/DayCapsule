# CLAUDE.md

此文档为 AI 助手(Claude Code)提供项目指引。

## 项目概览

**MemoryCapsule** 是一个使用 2025-2026 年最新生产级技术栈构建的现代化生活记录应用。

### 基本信息
- **框架**: Expo SDK 54 (React Native 0.81.5)
- **UI 语言**: TypeScript 5.9
- **路由**: Expo Router 6.0(文件系统路由)
- **状态管理**: Zustand 5.0
- **样式**: NativeWind 4.0 (Tailwind CSS)
- **存储**: React Native MMKV + Expo SQLite
- **所有命令在 `app/` 目录执行**

---

## 🏗️ 项目架构

### 技术栈选择理由

基于 2025-2026 年最佳实践:

| 技术 | 版本 | 原因 |
|------|------|------|
| **Expo SDK** | 54 | Meta 官方推荐,Shopify 等大公司生产环境使用 |
| **React Native** | 0.81.5 | 最新稳定版,性能最优 |
| **Zustand** | 5.0 | 2026 年最流行的状态管理(仅 1KB,超越 Redux) |
| **NativeWind** | 4.0 | 使用熟悉的 Tailwind 语法开发移动应用 |
| **Expo Router** | 6.0 | 文件系统路由,简化导航配置(类似 Next.js) |
| **MMKV** | 3.0 | 超快键值存储(比 AsyncStorage 快 30 倍) |

### 性能对比

| 特性 | 旧方案 | 新方案 | 提升 |
|------|--------|--------|------|
| 包大小 | Redux Toolkit (15KB) | Zustand (1KB) | 93% ↓ |
| 样式开发速度 | StyleSheet | NativeWind | 50% ↑ |
| 路由配置 | 手动配置 | 文件系统 | 80% ↓ |
| 存储速度 | AsyncStorage | MMKV | 30x ↑ |

---

## 📂 项目结构

```
MemoryCapsule/
├── app/                          # Expo 应用主目录
│   ├── app/                      # 文件路由目录(Expo Router)
│   │   ├── (tabs)/               # Tab 导航组
│   │   │   ├── index.tsx         # 主页
│   │   │   └── two.tsx           # 第二个标签页
│   │   ├── _layout.tsx           # 根布局
│   │   └── modal.tsx             # 模态页面示例
│   ├── src/
│   │   ├── store/                # Zustand stores
│   │   │   └── entryStore.ts     # 记录 store
│   │   ├── database/             # 数据库模型
│   │   ├── hooks/                # 自定义 Hooks
│   │   ├── types/                # TypeScript 类型
│   │   └── utils/                # 工具函数
│   ├── components/               # UI 组件
│   ├── assets/                   # 静态资源
│   ├── global.css                # Tailwind CSS
│   ├── tailwind.config.js        # Tailwind 配置
│   ├── babel.config.js           # Babel 配置(含 NativeWind)
│   └── package.json              # 依赖配置
├── README.md                     # 项目说明
└── CLAUDE.md                     # 本文档
```

---

## 🛠️ 开发命令

```bash
# 进入项目目录
cd app

# 启动开发服务器
npm start

# iOS 模拟器
npm run ios

# Android 模拟器
npm run android

# Web 浏览器(跨平台)
npm run web
```

---

## 💡 核心技术使用示例

### 1. Zustand 状态管理(零样板代码)

**位置**: `app/src/store/entryStore.ts`

```typescript
import { create } from 'zustand';

export interface Entry {
  id: string;
  type: 'text' | 'photo' | 'voice';
  content: string;
  timestamp: number;
  tags?: string[];
}

interface EntryStore {
  entries: Entry[];
  addEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => void;
  deleteEntry: (id: string) => void;
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],

  addEntry: (entry) => set((state) => ({
    entries: [
      ...state.entries,
      {
        ...entry,
        id: Date.now().toString(),
        timestamp: Date.now(),
      },
    ],
  })),

  deleteEntry: (id) => set((state) => ({
    entries: state.entries.filter((e) => e.id !== id),
  })),
}));
```

**使用方式**:
```typescript
const { entries, addEntry } = useEntryStore();
```

### 2. NativeWind 样式(Tailwind CSS)

**配置**: `app/tailwind.config.js`

```javascript
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#6200ee',
        secondary: '#03dac6',
        background: '#121212',
        surface: '#1e1e1e',
        error: '#cf6679',
      },
    },
  },
}
```

**使用示例**:
```tsx
<View className="flex-1 bg-background p-6">
  <Text className="text-3xl font-bold text-white">
    Hello World
  </Text>
  <TouchableOpacity className="bg-primary px-6 py-3 rounded-xl">
    <Text className="text-white font-semibold">按钮</Text>
  </TouchableOpacity>
</View>
```

### 3. Expo Router 导航(文件系统路由)

**路由结构**:
```
app/
├── (tabs)/
│   ├── index.tsx    → /(tabs) 或 /
│   └── two.tsx      → /(tabs)/two
├── _layout.tsx      → 根布局
└── modal.tsx        → /modal
```

**使用示例**:
```tsx
import { Link, useRouter } from 'expo-router';

// 声明式导航
<Link href="/modal">打开模态页面</Link>

// 编程式导航
const router = useRouter();
router.push('/modal');
```

---

## 🎨 主题配置

在 `tailwind.config.js` 中配置自定义颜色:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#6200ee',    // 主色
      secondary: '#03dac6',  // 辅助色
      background: '#121212', // 深色背景
      surface: '#1e1e1e',    // 表面色
      error: '#cf6679',      // 错误色
    },
  },
}
```

---

## 📱 当前功能实现

- ✅ 现代化的深色主题 UI
- ✅ Zustand 状态管理演示
- ✅ NativeWind (Tailwind CSS) 样式
- ✅ 文件路由系统(Expo Router)
- ✅ TypeScript 类型安全
- ✅ 添加/删除记录功能
- ✅ 跨平台支持(iOS/Android/Web)

---

## 🔧 关键配置文件

### `app/babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
```

### `app/global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `app/app/_layout.tsx`

引入全局样式:
```typescript
import "../global.css";
```

---

## 📚 参考资源

### 官方文档
- [Expo 文档](https://docs.expo.dev/)
- [Expo Router 文档](https://docs.expo.dev/router/introduction/)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [NativeWind 文档](https://www.nativewind.dev/)
- [React Native 0.81 发布说明](https://reactnative.dev/blog)

### 技术栈来源
- [React Native Tech Stack for 2025 | Galaxies.dev](https://galaxies.dev/article/react-native-tech-stack-2025)
- [Expo SDK 52 Release](https://expo.dev/changelog/2025-01-21-react-native-0.77)
- [State of React Native 2024](https://results.stateofreactnative.com/en-US/state-management/)

---

## 🚧 下一步开发计划

- [ ] 添加 WatermelonDB 数据库集成(高性能离线数据库)
- [ ] 实现照片上传功能
- [ ] 添加语音记录和转写
- [ ] 集成推送通知
- [ ] 实现数据同步功能
- [ ] 添加 AI 标签建议
- [ ] 多维时间线视图

---

## 🔐 安全与最佳实践

### 数据存储
- 使用 MMKV 进行高性能键值存储
- 使用 expo-sqlite 进行结构化数据存储
- 所有敏感数据计划使用 AES-256 加密

### 性能优化
- 使用 React Native Reanimated 实现 60fps 动画
- 所有核心操作 < 2 秒
- 内存使用 < 150MB

### 类型安全
- 全项目使用 TypeScript 5.9
- 严格类型检查
- 所有 store 和组件都有完整类型定义

---

## ⚠️ 重要提示

1. **所有命令必须在 `app/` 目录中执行**
2. **使用路径别名**: `@/src/store/entryStore` 代替相对路径
3. **样式优先使用 NativeWind**: 避免使用 StyleSheet,使用 className
4. **状态管理使用 Zustand**: 避免 Redux 或 Context API 过度使用
5. **路由使用文件系统**: 不要手动配置 React Navigation

---

## 🐛 常见问题

### Q: Metro bundler 端口冲突?
```bash
lsof -ti:8081 | xargs kill -9
npm start
```

### Q: iOS build 失败?
使用 Expo,不需要手动处理原生构建,所有配置通过 `app.json` 和 config plugins 完成。

### Q: 样式不生效?
确保:
1. `global.css` 在 `_layout.tsx` 中引入
2. `babel.config.js` 包含 nativewind 配置
3. 重启 Metro bundler

---

**Built with ❤️ using 2025-2026 modern React Native tech stack**

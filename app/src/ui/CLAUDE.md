[根目录](../../../CLAUDE.md) > [app](../../) > [src](../) > **ui**

# UI 组件模块文档

## 模块职责

通用 UI 组件库，提供跨功能模块复用的基础组件和高阶组件。

## 入口与启动

- **目录结构**: `components/` 存放所有通用组件
- **导出**: 通过 `index.ts` 统一导出
- **无需初始化**: 按需导入使用

## 对外接口

### 已识别组件

```
app/src/ui/components/
├── LoadingIndicator.tsx      # 加载指示器
├── EmptyState.tsx            # 空状态占位符
├── ErrorBoundary.tsx         # 错误边界
└── index.ts                  # 统一导出
```

### LoadingIndicator

```typescript
interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

// 使用示例
<LoadingIndicator message="加载中..." size="large" />
```

### EmptyState

```typescript
interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// 使用示例
<EmptyState
  icon="📭"
  title="暂无记录"
  message="点击下方按钮创建第一条记录"
  actionLabel="创建记录"
  onAction={handleCreate}
/>
```

### ErrorBoundary

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// 使用示例
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

## 关键依赖与配置

### 依赖项

```json
{
  "react": "18.2.0",
  "react-native": "0.74.3",
  "react-native-paper": "^5.14.5",
  "react-native-svg": "^15.15.1"
}
```

### 主题配置

使用项目统一主题（`app/src/app/theme.ts`）：

```typescript
import { theme } from '@app/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
});
```

## 组件设计原则

### 1. 可复用性
- 组件高度通用，适用于多个场景
- 通过 props 控制行为和样式
- 避免业务逻辑耦合

### 2. 可访问性
- 支持屏幕阅读器
- 提供清晰的交互反馈
- 符合 WCAG 2.1 标准

### 3. 性能优化
- 使用 React.memo 避免不必要的重渲染
- 样式使用 StyleSheet.create 缓存
- 避免在 render 中创建新对象

### 4. 类型安全
- 所有 props 必须有 TypeScript 类型定义
- 使用 React.FC 或显式类型注解
- 避免使用 any

## 建议新增组件

基于项目需求，建议添加以下通用组件：

### 基础组件
- **Button**: 统一风格的按钮组件
- **Input**: 文本输入框
- **Card**: 卡片容器
- **Avatar**: 头像组件
- **Badge**: 徽章/标签
- **Divider**: 分隔线

### 布局组件
- **Container**: 页面容器
- **Stack**: 垂直/水平堆叠布局
- **Grid**: 网格布局
- **SafeView**: 安全区域视图

### 反馈组件
- **Toast**: 轻提示
- **Modal**: 模态框
- **Alert**: 警告对话框
- **Skeleton**: 骨架屏

### 数据展示
- **List**: 列表组件
- **Timeline**: 时间线组件
- **Tag**: 标签组件
- **Progress**: 进度条

## 测试与质量

### 测试策略

- **快照测试**: 确保组件结构稳定
- **交互测试**: 测试用户交互行为
- **可访问性测试**: 验证无障碍支持
- **视觉回归测试**: 防止样式破坏

### 测试覆盖率

- 目标覆盖率: 90%
- 当前覆盖率: 待补充测试

### 待测试项

- [ ] LoadingIndicator 渲染测试
- [ ] EmptyState 交互测试
- [ ] ErrorBoundary 错误捕获测试
- [ ] 组件可访问性测试

## 常见问题 (FAQ)

### Q: 如何添加新组件？
A:
1. 在 `components/` 创建新文件（如 `Button.tsx`）
2. 定义 TypeScript 接口
3. 实现组件逻辑
4. 在 `index.ts` 中导出
5. 添加测试文件

### Q: 如何使用项目主题？
A: 导入 `@app/theme` 并使用：
```typescript
import { theme } from '@app/theme';
const styles = StyleSheet.create({
  text: { color: theme.colors.primary },
});
```

### Q: 组件库使用 React Native Paper 还是自定义？
A: 优先使用 React Native Paper 的基础组件，必要时扩展或自定义。

### Q: 如何处理不同平台的样式差异？
A: 使用 `Platform.select()` 或条件样式：
```typescript
const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: { shadowOpacity: 0.3 },
      android: { elevation: 4 },
    }),
  },
});
```

## 相关文件清单

```
app/src/ui/
├── components/
│   ├── LoadingIndicator.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   └── index.ts               # 统一导出
└── CLAUDE.md                  # 本文档
```

## 变更记录 (Changelog)

### 2026-01-06
- 初始化 UI 模块文档
- 识别 3 个现有通用组件
- 建议新增常用组件清单
- 定义组件设计原则

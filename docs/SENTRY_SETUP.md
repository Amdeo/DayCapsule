# Sentry 错误监控配置指南

## 概述

Sentry 已集成到 MemoryCapsule 应用中,用于追踪生产环境的错误和崩溃。本文档将指导您完成 Sentry 的配置。

## 前置条件

- Sentry 账号 (免费版即可)
- 已完成应用的基本配置

## 配置步骤

### 1. 创建 Sentry 项目

1. 访问 [Sentry.io](https://sentry.io/) 并登录
2. 点击 "Create Project"
3. 选择平台: **React Native**
4. 设置项目名称: `memorycapsule`
5. 选择团队 (或使用默认团队)
6. 点击 "Create Project"

### 2. 获取 DSN

创建项目后,Sentry 会显示 DSN (Data Source Name):

```
https://[PUBLIC_KEY]@[ORGANIZATION].ingest.sentry.io/[PROJECT_ID]
```

示例:
```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

### 3. 配置环境变量

#### 开发环境

编辑 `app/.env` 文件:

```env
# Sentry 错误监控
EXPO_PUBLIC_SENTRY_DSN=https://your-actual-dsn@sentry.io/project-id

# 应用配置
EXPO_PUBLIC_APP_ENV=development

# 功能开关
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false  # 开发环境建议关闭

# 调试选项
DEBUG_MODE=true
```

#### 生产环境

创建 `app/.env.production` 文件:

```env
# Sentry 错误监控
EXPO_PUBLIC_SENTRY_DSN=https://your-actual-dsn@sentry.io/project-id

# 应用配置
EXPO_PUBLIC_APP_ENV=production

# 功能开关
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true  # 生产环境启用

# 调试选项
DEBUG_MODE=false
```

### 4. 验证配置

#### 方法 1: 手动触发测试错误

在应用中添加测试按钮 (仅用于测试):

```typescript
import * as Sentry from '@sentry/react-native';

// 测试按钮
<TouchableOpacity onPress={() => {
  Sentry.captureMessage('测试消息', 'info');
  Sentry.captureException(new Error('测试错误'));
}}>
  <Text>测试 Sentry</Text>
</TouchableOpacity>
```

#### 方法 2: 使用 Sentry CLI

```bash
cd app
npx @sentry/wizard --integration reactNative
```

### 5. 查看错误报告

1. 登录 Sentry.io
2. 进入 MemoryCapsule 项目
3. 查看 "Issues" 页面
4. 应该能看到测试错误和消息

## 配置选项说明

### 采样率 (tracesSampleRate)

当前配置:
- 开发环境: 100% (所有事务都被追踪)
- 生产环境: 20% (仅追踪 20% 的事务,节省配额)

可在 `app/app/_layout.tsx` 中调整:

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 调整这里
});
```

### 会话追踪

当前配置:
- 自动会话追踪: 启用
- 追踪间隔: 30 秒

```typescript
Sentry.init({
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
});
```

### 环境区分

Sentry 会根据 `EXPO_PUBLIC_APP_ENV` 环境变量区分不同环境:
- `development` - 开发环境
- `staging` - 预发布环境
- `production` - 生产环境

## 错误捕获机制

### 1. React 组件错误

通过 `ErrorBoundary` 自动捕获:

```typescript
// app/src/components/ErrorBoundary.tsx
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}
```

### 2. 日志错误

通过 `logger.error()` 自动发送:

```typescript
// app/src/utils/logger.ts
error: (...args: any[]) => {
  console.error(...args);

  if (!isDev) {
    const error = args[0];
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), 'error');
    }
  }
}
```

### 3. 手动捕获

在代码中手动发送错误:

```typescript
import * as Sentry from '@sentry/react-native';

try {
  // 危险操作
} catch (error) {
  Sentry.captureException(error);
  logger.error('操作失败:', error);
}
```

## 最佳实践

### 1. 添加上下文信息

```typescript
Sentry.setContext('user', {
  id: userId,
  username: username,
});

Sentry.setTag('feature', 'voice-recording');
```

### 2. 面包屑追踪

```typescript
Sentry.addBreadcrumb({
  category: 'navigation',
  message: '用户进入录音页面',
  level: 'info',
});
```

### 3. 过滤敏感信息

在 `_layout.tsx` 中添加:

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    // 移除敏感信息
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
    }
    return event;
  },
});
```

## 故障排查

### 问题 1: 错误未上报到 Sentry

**检查清单**:
1. ✅ `EXPO_PUBLIC_SENTRY_DSN` 是否正确配置
2. ✅ `EXPO_PUBLIC_ENABLE_CRASH_REPORTING` 是否为 `true`
3. ✅ 网络连接是否正常
4. ✅ 是否在生产模式下运行 (`__DEV__` 为 `false`)

**调试方法**:
```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: true, // 启用调试日志
});
```

### 问题 2: 开发环境错误过多

**解决方案**:
在 `.env` 中设置:
```env
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
```

### 问题 3: Sentry 配额用完

**解决方案**:
1. 降低采样率: `tracesSampleRate: 0.1` (10%)
2. 添加错误过滤:
```typescript
Sentry.init({
  ignoreErrors: [
    'Network request failed',
    'Timeout',
  ],
});
```

## 监控指标

### 关键指标

在 Sentry 仪表板中关注:
1. **错误率** - 每小时错误数量
2. **崩溃率** - 应用崩溃频率
3. **受影响用户** - 遇到错误的用户数
4. **响应时间** - 应用性能指标

### 告警设置

1. 进入 Sentry 项目设置
2. 选择 "Alerts"
3. 创建规则:
   - 错误率超过阈值
   - 新错误出现
   - 崩溃率上升

## 成本优化

### 免费版限额

Sentry 免费版提供:
- 5,000 错误/月
- 10,000 性能事务/月
- 1 个项目

### 优化建议

1. **降低采样率**: 生产环境使用 10-20%
2. **过滤噪音**: 忽略已知的非关键错误
3. **合并相似错误**: 使用 fingerprinting
4. **定期清理**: 归档已解决的问题

## 相关文档

- [Sentry React Native 文档](https://docs.sentry.io/platforms/react-native/)
- [Expo + Sentry 集成](https://docs.expo.dev/guides/using-sentry/)
- [错误监控最佳实践](https://docs.sentry.io/product/best-practices/)

## 支持

如有问题,请联系:
- Sentry 支持: support@sentry.io
- 项目维护者: [您的联系方式]

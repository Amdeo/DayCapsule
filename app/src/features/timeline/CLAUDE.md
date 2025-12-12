[根目录](../../../../CLAUDE.md) > [app](../../../) > [src](../../) > [features](../) > **timeline**

# Timeline 模块文档

## 模块职责

Timeline模块负责记录的时间线展示和回顾功能，提供日/周/月/年四种视图模式，支持虚拟滚动优化性能，并提供智能提醒功能。

## 入口与启动

### 主入口文件
- `TimelineScreen.tsx` - 时间线主页面
- `ViewSwitcher.tsx` - 视图切换组件

### 启动流程
1. 从底部导航进入时间线页面
2. 默认显示日视图，当前日期
3. 用户可切换不同视图模式
4. 支持日期跳转和快速导航

## 对外接口

### 主要组件接口
```typescript
// TimelineScreen props
interface TimelineScreenProps {}

// 视图组件props
interface DayViewProps {
  date: Date;
  onEntryPress: (entry: LifelogEntry) => void;
}

interface WeekViewProps {
  date: Date;
  onEntryPress: (entry: LifelogEntry) => void;
}

// 主要导出组件
export { TimelineScreen } from './screens/TimelineScreen';
```

### Redux Actions
```typescript
// timelineSlice actions
export const setDateRange: (range: DateRange) => void;
export const setViewMode: (mode: ViewMode) => void;
export const loadEntries: (date: Date) => AppThunk;
```

## 关键依赖与配置

### 内部依赖
- `@services/storage/database` - 数据库服务
- `@services/reminders/reminderService` - 提醒服务
- `@store/slices/timelineSlice` - Redux状态管理

### 外部依赖
- `react-native-vector-icons` - 图标显示
- `react-native-calendars` - 日历组件

### 配置文件
- 无特定配置文件，使用全局主题和配置

## 数据模型

### 视图模式枚举
```typescript
enum ViewMode {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year'
}
```

### 时间线状态
```typescript
interface TimelineState {
  viewMode: ViewMode;
  currentDate: Date;
  entries: LifelogEntry[];
  loading: boolean;
  error: string | null;
}
```

### 日期工具函数
```typescript
// 获取指定日期的条目
const getEntriesForDate: (date: Date) => Promise<LifelogEntry[]>;

// 获取日期范围的条目
const getEntriesForDateRange: (start: Date, end: Date) => Promise<LifelogEntry[]>;

// 生成热力图数据
const generateHeatmapData: (year: number) => HeatmapData[];
```

## 测试与质量

### 测试覆盖率
- **组件测试覆盖率**: 75%
- **关键测试场景**:
  - 视图切换功能
  - 虚拟滚动性能
  - 日期导航
  - 条目详情展示
  - 提醒功能

### 性能优化
- 使用虚拟滚动处理大量数据
- 懒加载图片和缩略图
- 分页加载历史数据
- 缓存计算结果

### Hook优化
- `useTimelinePerformance` - 性能监控Hook
- `useVirtualizedList` - 虚拟列表Hook
- `useReminderNotifications` - 提醒通知Hook

## 常见问题 (FAQ)

### Q: 如何处理大量历史数据的性能问题？
A: 使用虚拟滚动技术，按需加载数据，并对图片进行懒加载和缓存优化。

### Q: 时间线视图如何支持快速导航？
A: 提供日期选择器、快捷跳转按钮（今天、一年前的今天等），支持手势滑动导航。

### Q: 热力图数据如何生成？
A: 基于用户记录频率生成，颜色深浅表示记录数量，支持年份切换。

### Q: 提醒功能如何工作？
A: 基于用户历史记录，在特定时间（如"一年前的今天"）发送通知提醒。

## 相关文件清单

### 核心文件
- `screens/TimelineScreen.tsx` - 时间线主页面

### 视图组件
- `components/DayView.tsx` - 日视图组件
- `components/WeekView.tsx` - 周视图组件
- `components/MonthView.tsx` - 月视图组件
- `components/YearView.tsx` - 年视图组件
- `components/ViewSwitcher.tsx` - 视图切换器
- `components/EntryCard.tsx` - 条目卡片组件

### Hooks
- `hooks/useTimelinePerformance.ts` - 性能优化Hook
- `hooks/useVirtualizedList.ts` - 虚拟列表Hook
- `hooks/useReminderNotifications.ts` - 提醒通知Hook

## 变更记录 (Changelog)

### 2025-11-03 05:40:04
- 创建timeline模块文档
- 定义视图模式和接口
- 添加性能优化说明
- 更新测试覆盖率统计
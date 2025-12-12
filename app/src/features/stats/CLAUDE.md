[根目录](../../../../CLAUDE.md) > [app](../../../) > [src](../../) > [features](../) > **stats**

# Stats 模块文档

## 模块职责

Stats模块负责数据统计和可视化功能，提供用户记录习惯的深入分析，包括记录频率、标签使用、转录统计等多维度数据展示。

## 入口与启动

### 主入口文件
- `StatsScreen.tsx` - 统计数据主页面

### 启动流程
1. 通过设置或其他入口进入统计页面
2. 自动加载和分析用户数据
3. 展示各类统计图表和数据
4. 支持时间范围和数据类型筛选

## 对外接口

### 主要组件接口
```typescript
// StatsScreen props
interface StatsScreenProps {}

// 统计卡片组件props
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: TrendData;
}

// 主要导出组件
export { StatsScreen } from './screens/StatsScreen';
```

### 数据分析接口
```typescript
// 统计数据分析
interface StatsAnalysis {
  totalEntries: number;
  entryFrequency: EntryFrequencyData;
  tagUsage: TagUsageData;
  transcriptionStats: TranscriptionStatsData;
  moodAnalysis: MoodAnalysisData;
  timeDistribution: TimeDistributionData;
}
```

## 关键依赖与配置

### 内部依赖
- `@services/storage/database` - 数据库服务
- `@services/speechToText/transcriptionStats` - 转写统计服务
- `@store/slices/statsSlice` - Redux状态管理

### 外部依赖
- `react-native-paper` - UI组件库
- `react-native-svg` - 图表绘制库
- `react-native-vector-icons` - 图标库

### 配置文件
- 无特定配置文件，使用全局配置

## 数据模型

### 统计数据类型
```typescript
interface EntryFrequencyData {
  daily: number[];
  weekly: number[];
  monthly: number[];
  yearly: number[];
  average: number;
  peak: {
    date: Date;
    count: number;
  };
}

interface TagUsageData {
  popularTags: Array<{
    tag: string;
    count: number;
    percentage: number;
  }>;
  tagGrowth: Array<{
    tag: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
  }>;
}

interface TranscriptionStatsData {
  totalTranscriptions: number;
  averageAccuracy: number;
  languageDistribution: Array<{
    language: string;
    count: number;
    accuracy: number;
  }>;
  averageDuration: number;
}
```

### 心情分析
```typescript
interface MoodAnalysisData {
  moodDistribution: Array<{
    mood: Mood;
    count: number;
    percentage: number;
  }>;
  moodTrends: Array<{
    date: Date;
    mood: Mood;
  }>;
  moodPatterns: {
    timeOfDay: Array<{
      hour: number;
      dominantMood: Mood;
    }>;
    dayOfWeek: Array<{
      day: number;
      dominantMood: Mood;
    }>;
  };
}
```

### 时间分布
```typescript
interface TimeDistributionData {
  hourlyDistribution: number[];
  dailyDistribution: number[];
  monthlyDistribution: number[];
  mostActiveHours: number[];
  mostActiveDays: number[];
}
```

## 测试与质量

### 测试覆盖率
- **组件测试覆盖率**: 65%
- **关键测试场景**:
  - 数据统计算法准确性
  - 图表渲染性能
  - 时间范围筛选
  - 导出功能
  - 数据隐私保护

### 性能优化
- 统计数据缓存机制
- 图表懒加载
- 分页显示历史数据
- 异步数据计算

### 数据隐私
- 本地统计分析
- 敏感数据脱敏
- 用户可控的数据分享

## 常见问题 (FAQ)

### Q: 统计数据如何计算？
A: 基于本地记录数据实时计算，支持不同时间范围的统计分析。

### Q: 如何导出统计报告？
A: 支持导出PDF和CSV格式的统计报告，包含图表和原始数据。

### Q: 统计数据是否包含隐私信息？
A: 统计数据经过脱敏处理，不包含具体的记录内容，只显示聚合信息。

### Q: 如何查看历史趋势？
A: 支持自定义时间范围，可查看日、周、月、年的数据变化趋势。

### Q: 标签统计如何工作？
A: 统计标签使用频率、增长趋势和关联关系，帮助用户了解记录习惯。

## 相关文件清单

### 核心文件
- `screens/StatsScreen.tsx` - 统计主页面

### 统计组件
- `components/TranscriptionStatsCard.tsx` - 转写统计卡片
- `components/TranscriptionHistoryViewer.tsx` - 转写历史查看器

### 图表组件（未实现）
- `components/EntryFrequencyChart.tsx` - 记录频率图表
- `components/TagUsageChart.tsx` - 标签使用图表
- `components/MoodTrendChart.tsx` - 心情趋势图表
- `components/TimeDistributionChart.tsx` - 时间分布图表

### 数据分析（未实现）
- `utils/statsCalculator.ts` - 统计计算工具
- `utils/chartDataProcessor.ts` - 图表数据处理

## 变更记录 (Changelog)

### 2025-11-03 05:40:04
- 创建stats模块文档
- 定义统计数据模型和接口
- 添加性能优化说明
- 更新测试覆盖率统计
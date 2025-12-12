[根目录](../../../../CLAUDE.md) > [app](../../../) > [src](../../) > [features](../) > **search**

# Search 模块文档

## 模块职责

Search模块提供强大的搜索和筛选功能，支持全文搜索、语义搜索和多维筛选，帮助用户快速定位特定记录，并提供数据导出功能。

## 入口与启动

### 主入口文件
- `SearchScreen.tsx` - 搜索主页面

### 启动流程
1. 从底部导航进入搜索页面
2. 显示搜索框和搜索历史
3. 用户输入关键词触发搜索
4. 展示搜索结果和筛选选项

## 对外接口

### 主要组件接口
```typescript
// SearchScreen props
interface SearchScreenProps {}

// 搜索结果组件props
interface SearchResultsProps {
  query: string;
  filters: SearchFilters;
  onEntryPress: (entry: LifelogEntry) => void;
}

// 主要导出组件
export { SearchScreen } from './screens/SearchScreen';
```

### Redux Actions
```typescript
// searchSlice actions
export const searchEntries: (query: string, filters?: SearchFilters) => AppThunk;
export const setFilters: (filters: SearchFilters) => void;
export const clearSearch: () => void;
export const addToSearchHistory: (query: string) => void;
```

## 关键依赖与配置

### 内部依赖
- `@services/storage/database` - 数据库服务（FTS5全文搜索）
- `@services/ai/semanticSearch` - 语义搜索服务
- `@services/export/exportService` - 导出服务
- `@store/slices/searchSlice` - Redux状态管理

### 外部依赖
- `react-native-paper` - UI组件库
- `react-native-vector-icons` - 图标库

### 配置文件
- 无特定配置文件，使用全局配置

## 数据模型

### 搜索过滤器
```typescript
interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  mood?: Mood[];
  location?: string[];
  entryTypes?: ('photo' | 'text' | 'voice')[];
}
```

### 搜索状态
```typescript
interface SearchState {
  query: string;
  results: LifelogEntry[];
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
  searchHistory: string[];
  suggestions: string[];
}
```

### 搜索结果
```typescript
interface SearchResult {
  entry: LifelogEntry;
  relevanceScore: number;
  matchedFields: string[];
  highlights: {
    content: string[];
    transcription: string[];
    tags: string[];
  };
}
```

## 测试与质量

### 测试覆盖率
- **组件测试覆盖率**: 70%
- **关键测试场景**:
  - 全文搜索功能
  - 语义搜索准确性
  - 筛选器组合
  - 搜索历史管理
  - 导出功能

### 性能优化
- 使用FTS5全文搜索引擎
- 搜索结果分页加载
- 搜索建议防抖优化
- 缓存常用搜索结果

### Hook优化
- `useSearchHistory` - 搜索历史管理Hook
- `useSearchPerformance` - 搜索性能监控Hook

## 常见问题 (FAQ)

### Q: 全文搜索和语义搜索有什么区别？
A: 全文搜索基于关键词匹配，快速准确；语义搜索基于内容理解，能找到相关但不含关键词的记录。

### Q: 如何处理搜索结果为空的情况？
A: 提供搜索建议、推荐相关标签、显示搜索帮助和热门搜索。

### Q: 导出功能支持哪些格式？
A: 支持PDF、Word、CSV、JSON格式，包含媒体缩略图和完整元数据。

### Q: 搜索历史如何管理？
A: 自动保存搜索记录，支持手动删除，提供热门搜索推荐。

## 相关文件清单

### 核心文件
- `screens/SearchScreen.tsx` - 搜索主页面

### 搜索组件
- `components/SearchBar.tsx` - 搜索输入框
- `components/SearchResults.tsx` - 搜索结果列表
- `components/SearchResultItem.tsx` - 搜索结果项
- `components/FilterPanel.tsx` - 筛选面板
- `components/NoResultsHelper.tsx` - 无结果帮助组件

### 筛选组件
- `components/TagFilter.tsx` - 标签筛选器
- `components/MoodFilter.tsx` - 心情筛选器
- `components/LocationFilter.tsx` - 位置筛选器
- `components/DateRangePicker.tsx` - 日期范围选择器

### 功能组件
- `components/ExportDialog.tsx` - 导出对话框
- `components/HighlightedText.tsx` - 高亮文本组件

### Hooks
- `hooks/useSearchHistory.ts` - 搜索历史Hook
- `hooks/useSearchPerformance.ts` - 搜索性能Hook

## 变更记录 (Changelog)

### 2025-11-03 05:40:04
- 创建search模块文档
- 定义搜索接口和数据模型
- 添加性能优化说明
- 更新测试覆盖率统计
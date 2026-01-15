# 快速参考指南

## 开发命令

```bash
# 进入项目目录
cd app/

# 启动开发服务器
npm start

# iOS 模拟器
npm run ios

# Android 模拟器
npm run android

# Web 浏览器
npm run web
```

## 数据持久化 API

### 存储工具 (`src/utils/storage.ts`)

```typescript
import { Storage } from '@/src/utils/storage';

// 存储字符串
await Storage.setString('key', 'value');

// 获取字符串
const value = await Storage.getString('key');

// 存储对象（自动 JSON 序列化）
await Storage.setObject('entries', [{ id: '1', content: '...' }]);

// 获取对象（自动 JSON 反序列化）
const entries = await Storage.getObject<Entry[]>('entries');

// 删除单个键
await Storage.delete('key');

// 清空所有数据
await Storage.clearAll();

// 获取所有键
const keys = await Storage.getAllKeys();
```

### 状态管理 (`src/store/entryStore.ts`)

```typescript
import { useEntryStore } from '@/src/store/entryStore';

// 在组件中使用
const { entries, isLoading, loadEntries, addEntry, deleteEntry } = useEntryStore();

// 加载数据（在 useEffect 中调用）
useEffect(() => {
  loadEntries();
}, []);

// 添加记录（返回 Promise）
await addEntry({
  type: 'text',
  content: 'Hello World'
});

// 删除记录（返回 Promise）
await deleteEntry('entry-id');

// 获取最近的记录
const recent = useEntryStore().getRecentEntries(5);
```

## 常见模式

### 1. 在组件中加载数据

```typescript
import { useEffect, useState } from 'react';
import { useEntryStore } from '@/src/store/entryStore';

export default function MyComponent() {
  const { entries, isLoading, loadEntries } = useEntryStore();

  useEffect(() => {
    loadEntries();
  }, []);

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      {entries.map(entry => (
        <Text key={entry.id}>{entry.content}</Text>
      ))}
    </View>
  );
}
```

### 2. 异步操作处理

```typescript
const handleAddEntry = async () => {
  try {
    await addEntry({
      type: 'text',
      content: inputValue
    });
    setInputValue('');
    // UI 自动更新
  } catch (error) {
    console.error('Failed to add entry:', error);
    // 显示错误提示
  }
};
```

### 3. 监听数据变化

```typescript
// Zustand 支持订阅
useEntryStore.subscribe(
  (state) => state.entries,
  (entries) => {
    console.log('Entries updated:', entries);
  }
);
```

## 类型定义

```typescript
interface Entry {
  id: string;              // 唯一标识（时间戳）
  type: 'text' | 'photo' | 'voice';  // 记录类型
  content: string;         // 记录内容
  timestamp: number;       // 创建时间（毫秒）
  tags?: string[];         // 可选标签
}

interface EntryStore {
  entries: Entry[];
  isLoading: boolean;
  loadEntries(): Promise<void>;
  addEntry(entry: Omit<Entry, 'id' | 'timestamp'>): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  getRecentEntries(limit?: number): Entry[];
}
```

## 文件结构

```
app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx         # 主页面（记录列表）
│   │   └── two.tsx           # 第二个页面
│   ├── _layout.tsx           # 根布局
│   └── modal.tsx             # 模态页面
├── src/
│   ├── store/
│   │   └── entryStore.ts     # ← Zustand 状态管理
│   ├── utils/
│   │   └── storage.ts        # ← 存储工具层
│   ├── types/                # 类型定义
│   └── database/             # 数据库模型
├── components/               # UI 组件
├── global.css               # Tailwind CSS
├── tailwind.config.js       # Tailwind 配置
├── babel.config.js          # Babel 配置
└── package.json             # 依赖配置
```

## 技术决策

### 为什么选择 AsyncStorage？

| 方案 | AsyncStorage | MMKV | 数据库 |
|------|---|---|---|
| 性能 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Expo Go | ✅ | ❌ | ⚠️ |
| 易用性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 数据量 | 中 (< 10MB) | 大 | 很大 |

**选择 AsyncStorage 的原因**：
- ✅ Expo Go 兼容，快速开发迭代
- ✅ API 简洁，学习成本低
- ✅ 跨平台一致性好
- ✅ 足够的性能（应用级数据）

**未来升级**：
- 数据量增大 (> 50MB) → MMKV
- 需要复杂查询 → WatermelonDB

## 性能优化技巧

1. **异步操作不阻塞 UI**
   ```typescript
   // ✅ 好：先更新 UI，后保存
   set({ entries: newEntries });
   await Storage.setObject(ENTRIES_KEY, newEntries);

   // ❌ 不好：等待保存再更新 UI
   await Storage.setObject(ENTRIES_KEY, newEntries);
   set({ entries: newEntries });
   ```

2. **避免不必要的重新渲染**
   ```typescript
   // ✅ 使用 useCallback 缓存函数
   const handleAdd = useCallback(async (entry) => {
     await addEntry(entry);
   }, []);

   // ✅ 只监听需要的状态
   const entries = useEntryStore((state) => state.entries);
   ```

3. **批量操作优化**
   ```typescript
   // 如果需要一次保存多条记录
   const addMultipleEntries = async (newEntries) => {
     const allEntries = [...get().entries, ...newEntries];
     set({ entries: allEntries });
     await Storage.setObject(ENTRIES_KEY, allEntries);
   };
   ```

## 调试技巧

### 查看 AsyncStorage 内容

```typescript
// 在浏览器控制台运行
import AsyncStorage from '@react-native-async-storage/async-storage';

// 获取所有数据
const allData = await AsyncStorage.getAllKeys();
console.log('All keys:', allData);

// 获取特定数据
const entries = await AsyncStorage.getItem('entries');
console.log('Entries:', JSON.parse(entries));

// 清空所有数据（谨慎！）
await AsyncStorage.clear();
```

### 查看状态日志

```typescript
// 订阅所有状态变化
useEntryStore.subscribe(
  (state) => state,
  (state) => console.log('State updated:', state)
);
```

## 常见问题

### Q: 数据在重启后丢失？

A: 确保：
1. ✅ 在 useEffect 中调用 `loadEntries()`
2. ✅ 添加/删除操作都是异步的
3. ✅ 不要使用 `AsyncStorage.clear()`

### Q: 大量数据导致应用缓慢？

A: 优化方案：
1. 只加载最近的 N 条记录
2. 迁移到 WatermelonDB（支持分页查询）
3. 使用虚拟列表（FlatList）

### Q: 如何导出数据？

A:
```typescript
const entries = await Storage.getObject<Entry[]>('entries');
const json = JSON.stringify(entries, null, 2);
// 保存为文件或上传到服务器
```

## 下一步开发清单

- [ ] 照片记录（Expo Camera）
- [ ] 语音记录（Expo Audio）
- [ ] 搜索功能
- [ ] 标签系统
- [ ] 数据导出
- [ ] 云同步
- [ ] AI 标签建议

## 相关文档

- [AsyncStorage 文档](https://react-native-async-storage.github.io/async-storage/)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [Expo 文档](https://docs.expo.dev/)
- [TESTING.md](./TESTING.md) - 详细测试指南
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 完整实现总结

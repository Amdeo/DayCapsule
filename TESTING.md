# 数据持久化功能测试指南

## 功能概述

本次实现了完整的数据持久化功能，使用 AsyncStorage 确保用户记录在应用重启后仍可保存。

## 技术方案

### 为什么选择 AsyncStorage？

- ✅ **Expo Go 兼容**：可直接在 Expo Go 中运行，无需编译原生代码
- ✅ **跨平台**：在 iOS、Android 和 Web 上都能工作
- ✅ **简单易用**：API 简洁明了
- ℹ️ **性能**：虽然比 MMKV 慢，但对于应用级数据足够快

> 注：MMKV 需要编译原生模块，无法在 Expo Go 中直接运行，所以选择了 AsyncStorage 作为替代方案。

## 实现细节

### 1. 存储工具层 (`app/src/utils/storage.ts`)

提供通用的存储接口，包括：

```typescript
- setString(key, value): Promise<void>
- getString(key): Promise<string | null>
- setObject<T>(key, value): Promise<T | null>    // 自动 JSON 序列化
- getObject<T>(key): Promise<T | null>           // 自动 JSON 反序列化
- delete(key): Promise<void>
- clearAll(): Promise<void>
- getAllKeys(): Promise<string[]>
```

所有方法都包含错误处理，失败时会输出错误日志但不会中断应用。

### 2. 状态管理层 (`app/src/store/entryStore.ts`)

Zustand store 增强了以下功能：

```typescript
interface EntryStore {
  entries: Entry[];
  isLoading: boolean;              // 加载状态标志
  loadEntries(): Promise<void>;     // 从 AsyncStorage 加载数据
  addEntry(entry): Promise<void>;   // 添加记录（异步保存）
  deleteEntry(id): Promise<void>;   // 删除记录（异步保存）
  getRecentEntries(limit): Entry[]; // 获取最近的记录
}
```

**关键设计**：
- `loadEntries` 在应用启动时调用
- `addEntry` 和 `deleteEntry` 先更新内存状态（快速反应），再异步保存到磁盘
- 使用 `isLoading` 标志管理加载过程中的 UI 状态

### 3. UI 层 (`app/app/(tabs)/index.tsx`)

主页面集成了以下特性：

```typescript
// 在组件挂载时加载数据
useEffect(() => {
  loadEntries();
}, []);

// 显示加载状态
{isLoading ? (
  <ActivityIndicator ... />
) : entries.length === 0 ? (
  // 空状态
) : (
  // 记录列表
)}

// 异步保存操作
const handleAddEntry = async () => {
  await addEntry({...});
};
```

## 测试流程

### 准备工作

1. 确保 Metro Bundler 正在运行：
   ```bash
   cd app/
   npm start
   ```

2. 启动模拟器（选择一种）：
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web
   npm run web
   ```

### 测试场景

#### 场景 1：添加记录并验证持久化

1. **添加记录**
   - 输入文字：`"这是第一条记录"`
   - 点击"添加"按钮
   - ✅ 应看到新记录出现在列表中
   - 💾 记录自动保存到 AsyncStorage

2. **关闭应用并重启**
   - 完全关闭应用
   - 重新打开应用
   - ✅ 应看到加载动画短暂显示
   - ✅ 之前添加的记录应该仍然存在

3. **添加多条记录**
   - 重复添加 3-5 条不同的记录
   - 每条记录都应立即显示并自动保存

#### 场景 2：删除记录

1. **删除单条记录**
   - 在任何一条记录上点击"删除"按钮
   - ✅ 记录应立即从列表中消失
   - 💾 删除操作自动保存到 AsyncStorage

2. **重启应用验证**
   - 完全关闭应用
   - 重新打开应用
   - ✅ 删除的记录不应该出现

#### 场景 3：多平台一致性

> 由于 AsyncStorage 在不同平台使用不同的后端存储，数据**不会**在平台之间同步。这是正常的预期行为。

- iOS：使用本机 SQLite
- Android：使用本机 SharedPreferences
- Web：使用浏览器 LocalStorage

#### 场景 4：错误恢复

1. **损坏的存储数据**
   - 清空 AsyncStorage：在控制台运行 `Storage.clearAll()`
   - 重启应用
   - ✅ 应看到加载动画，然后显示"空状态"提示

2. **大量数据**
   - 添加 20+ 条记录
   - 重启应用
   - ✅ 所有记录应全部恢复

## 性能指标

| 操作 | 预期时间 | 说明 |
|------|---------|------|
| 应用启动加载数据 | < 500ms | 取决于存储的记录数 |
| 添加记录 | < 100ms（UI）+ 异步保存 | 先更新 UI，后台保存 |
| 删除记录 | < 100ms（UI）+ 异步保存 | 先更新 UI，后台保存 |

## 故障排查

### 问题：启动时看不到加载动画

**原因**：数据快速加载完成，或者没有任何保存的数据

**解决**：
1. 添加一些记录
2. 完全杀死应用进程
3. 重新启动应用

### 问题：记录在重启后丢失

**检查清单**：
1. 确保使用的是真实模拟器，不是 Expo Go
2. 检查浏览器控制台是否有错误日志
3. 验证 AsyncStorage 是否成功初始化

### 问题：性能较慢

**优化建议**（未来改进）：
1. 迁移到 WatermelonDB（支持更好的性能和查询）
2. 或者在原生代码中使用 MMKV（需要 EAS Build）

## 代码覆盖

### 新增文件
- `app/src/utils/storage.ts` - 存储工具层（89 行）

### 修改文件
- `app/src/store/entryStore.ts` - 增加持久化支持（80 行 → 79 行，净增 -1 行但功能大幅增强）
- `app/app/(tabs)/index.tsx` - 集成加载逻辑（93 行 → 115 行）
- `app/package.json` - 添加 AsyncStorage 依赖

## 下一步改进方向

### 短期（1-2 周）
- [ ] 添加照片记录功能
- [ ] 实现语音记录功能
- [ ] 添加标签系统

### 中期（1 个月）
- [ ] 迁移到 WatermelonDB 以支持：
  - 离线查询
  - 关系数据
  - 自动同步
- [ ] 实现数据导出功能（JSON/PDF）

### 长期（3 个月）
- [ ] 云端同步
- [ ] 跨设备同步
- [ ] 加密存储敏感数据

## 相关文档

- [AsyncStorage 官方文档](https://react-native-async-storage.github.io/async-storage/)
- [Zustand 状态管理](https://github.com/pmndrs/zustand)
- [Expo 存储最佳实践](https://docs.expo.dev/build-reference/local-build/)

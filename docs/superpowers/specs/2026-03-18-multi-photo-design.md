# 多图片选择与展示设计

**日期**: 2026-03-18
**状态**: 已批准

## 目标

支持用户在创建一条记录时选择最多 9 张照片，以自适应网格展示在卡片中；超出 8 张时最后一格显示溢出数字。

---

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/src/types/entry.ts` | 修改 | `media` 字段改为数组 |
| `app/src/database/migration.ts` | 修改 | 新增 `media_json` 迁移函数 |
| `app/src/database/sqlite.ts` | 修改 | 调用新迁移 |
| `app/src/database/operations.ts` | 修改 | 读写改用 `media_json`（含 `restoreEntries`）|
| `app/src/services/photoService.ts` | 修改 | 开启多选 |
| `app/src/components/PhotoGrid.tsx` | 新增 | 自适应网格组件 |
| `app/src/components/EntryCard.tsx` | 修改 | 使用 PhotoGrid，更新所有 media 访问 |
| `app/app/(tabs)/index.tsx` | 修改 | 处理多张照片创建 entry（含 `handlePhotoSelectForTest`）|
| `app/src/components/FABMenu.tsx` | 修改 | 传递完整 PhotoResult[] |

---

## 一、数据模型

### 1.1 Entry 类型

**`app/src/types/entry.ts`**，将 `media` 字段改为数组：

```ts
// 改前
media?: MediaInfo;

// 改后
media?: MediaInfo[];  // 照片：1–9 项；语音：始终 1 项
```

所有使用方更新访问方式：
- 单媒体访问：`entry.media?.[0]`（代替 `entry.media`）
- 遍历：`entry.media?.forEach(...)` 或 `entry.media?.map(...)`

---

## 二、数据库

### 2.1 新增 `media_json` 列

SQLite 旧版本不支持 DROP COLUMN，保留现有 `media_uri`、`media_type`、`media_duration`、`media_thumbnail`、`media_metadata` 列（不再写入，仅保留结构），新增：

```sql
ALTER TABLE entries ADD COLUMN media_json TEXT
```

### 2.2 迁移函数

在 `migration.ts` 新增 `migrateToMediaJson()`：

```ts
export const migrateToMediaJson = async (): Promise<void> => {
  if (migrationStore.getString('media_json_migrated') === 'true') return;
  const db = getDatabase();

  // 添加列（如已存在则跳过）
  const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
  if (!tableInfo.some(col => col.name === 'media_json')) {
    await db.runAsync(`ALTER TABLE entries ADD COLUMN media_json TEXT`);
  }

  // 将现有 media_uri 行转成 JSON 数组
  const rows = await db.getAllAsync<{
    id: string;
    media_uri: string | null;
    media_type: string | null;
    media_duration: number | null;
    media_thumbnail: string | null;
    media_metadata: string | null;
  }>(`SELECT id, media_uri, media_type, media_duration, media_thumbnail, media_metadata
      FROM entries WHERE media_uri IS NOT NULL AND media_json IS NULL`);

  for (const row of rows) {
    const mediaItem = {
      uri: row.media_uri!,
      mimeType: row.media_type ?? 'image/jpeg',
      size: 0,
      duration: row.media_duration ?? undefined,
      thumbnail: row.media_thumbnail ?? undefined,
      metadata: row.media_metadata ? JSON.parse(row.media_metadata) : undefined,
    };
    await db.runAsync(
      `UPDATE entries SET media_json = ? WHERE id = ?`,
      [JSON.stringify([mediaItem]), row.id]
    );
  }

  migrationStore.set('media_json_migrated', 'true');
};
```

### 2.3 在 `sqlite.ts` 中调用

在数据库初始化完成后调用（与 `migrateMediaMetadataColumns` 并列）：

```ts
await migrateToMediaJson();
```

### 2.4 `operations.ts` 读写

**读（rowToEntry）**：
```ts
// 改前：独立字段映射
media: row.media_uri ? { uri: row.media_uri, ... } : undefined

// 改后：从 media_json 反序列化
media: row.media_json ? JSON.parse(row.media_json) as MediaInfo[] : undefined
```

**写（insertEntry / updateEntry）**：
```ts
// 改前：写多个独立列
// 改后：只写 media_json
const mediaJson = entry.media ? JSON.stringify(entry.media) : null;
// INSERT/UPDATE 语句中用 media_json = ?，传入 mediaJson
```

> 旧列 `media_uri` 等不再写入，保留为 NULL（结构兼容，不影响查询）。

**`restoreEntries` 函数**（约第 443–490 行）同样需要更新：将 `e.media?.uri`、`e.media?.mimeType` 等单对象访问改为 `e.media?.[0]?.uri`，写入时使用 `media_json` 而非旧独立列。

**`cachedColumnNames` 缓存失效**：`operations.ts` 用模块级变量 `cachedColumnNames` 缓存 PRAGMA 结果。迁移新增 `media_json` 列后，必须在迁移函数末尾调用 `invalidateColumnCache()` 或等效方式将缓存置为 `null`，让 `getTableColumns` 下次重新加载，否则 `columns.has('media_json')` 的判断永远不成立。

---

## 三、PhotoService 多选

**`photoService.ts`** 中 `pickPhotoFromLibrary` 新增多选选项：

```ts
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: true,   // 新增
  selectionLimit: 9,               // 新增
  allowsEditing: false,
  quality: options?.quality ?? 0.95,
});
```

返回值不变（已是 `PhotoResult[]`），无需其他改动。

---

## 四、PhotoGrid 组件

**新增 `app/src/components/PhotoGrid.tsx`**，单一职责：根据 `MediaInfo[]` 渲染自适应网格。

### 4.1 布局规则

| 张数 | 列数 | 说明 |
|------|------|------|
| 1 | 1 | 全宽，固定高度，`resizeMode="cover"`（委托给 EntryCard 现有逻辑） |
| 2 | 2 | 2 列 1 行 |
| 3 | 3 | 3 列 1 行 |
| 4–9 | 3 | 3 列网格；超过 8 项时第 9 格显示 `+N` |

- `maxDisplay = 8`（常量）
- 当 `photos.length > maxDisplay` 时：显示前 `maxDisplay - 1` 张 + 第 `maxDisplay` 格为溢出指示器（`+N`，N = `photos.length - (maxDisplay - 1)`）
- 当 `photos.length <= maxDisplay` 时：全部显示

### 4.2 格子尺寸

```ts
const GAP = 3; // px，格子间距
const numCols = photos.length <= 1 ? 1 : photos.length <= 3 ? photos.length : 3;
const cellSize = (containerWidth - GAP * (numCols - 1)) / numCols;
// 正方形：height = cellSize
```

`containerWidth` 由 `onLayout` 从父容器获取。

### 4.3 组件接口

```ts
import { ViewStyle } from 'react-native';

interface PhotoGridProps {
  photos: MediaInfo[];           // 照片列表
  maxPhotoHeight: number;        // 单张全宽时的固定高度（来自档位设置）
  photoImageRadius: ViewStyle;   // 动态圆角对象，如 { borderRadius: 10 } 或 { borderRadius: 10, borderBottomLeftRadius: 0, ... }
  onPhotoPress?: (index: number) => void;
}
```

单张照片（`photos.length === 1`）时，PhotoGrid 渲染与现在 EntryCard 中相同的单图结构（固定高度、cover、photoImageRadius），无 grid 布局。

### 4.4 溢出格渲染

```tsx
<View style={[styles.cell, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
  <Text style={styles.overflowText}>+{overflow}</Text>
</View>
```

---

## 五、EntryCard 变更

- 删除当前照片渲染逻辑（约第 480–510 行），替换为 `<PhotoGrid>` 调用
- 将 `hasPhotoFooter`、`photoImageRadius`、`maxPhotoHeight` 传入 PhotoGrid
- 所有 `entry.media?.uri` 改为 `entry.media?.[0]?.uri`
- 所有 `entry.media?.thumbnail` 改为 `entry.media?.[0]?.thumbnail`
- 所有 `entry.media?.metadata?.aspectRatio` 改为 `entry.media?.[0]?.metadata?.aspectRatio`

---

## 六、创建流程变更

### 6.1 FABMenu

`onSelect` 类型从 `(type, photo?: PhotoResult)` 改为 `(type, photos?: PhotoResult[])`。

**`photo` 分支**（相册选择）：
```ts
// 改前
const photo = result[0];
if (photo) onSelectRef.current('photo', photo);

// 改后
if (result.length > 0) onSelectRef.current('photo', result);
```

**`camera` 分支**（拍照）：拍照返回单张，包装成数组后传出：
```ts
// 改前
const photo = await PhotoService.takePhoto();
if (photo) onSelectRef.current('photo', photo);

// 改后
const photo = await PhotoService.takePhoto();
if (photo) onSelectRef.current('photo', [photo]);
```

### 6.2 index.tsx

**`handlePhotoSelect`** 和 **`handlePhotoSelectForTest`** 均改为接收 `PhotoResult[]`，对每张图片执行压缩和保存，最终合并成 `MediaInfo[]` 创建 entry。

`PhotoSelectDeps.addEntry` 中的 `media` 字段类型随之改为 `MediaInfo[]`。

`index.tsx` 第 100、104 行语音预加载处 `entry.media?.uri` 改为 `entry.media?.[0]?.uri`。

```ts
const handlePhotoSelect = async (results: PhotoResult[]) => {
  const mediaList: MediaInfo[] = [];
  for (const result of results) {
    const saved = await PhotoService.savePhotoToStorage(result.uri, fileId, 'medium', result.aspectRatio);
    mediaList.push({ uri: saved.originalUri, mimeType: 'image/jpeg', size: 0,
      thumbnail: saved.thumbnailUri, metadata: { ... } });
  }
  await addEntry({ type: 'photo', content: '', syncStatus: 'pending', media: mediaList });
};
```

---

## 七、测试要求

| 场景 | 预期行为 |
|------|---------|
| 1 张照片 | PhotoGrid 渲染单图（全宽固定高度，cover） |
| 2 张照片 | 2 列并排 |
| 3 张照片 | 3 列并排 |
| 4 张照片 | 3 列网格（3+1） |
| 9 张照片 | 显示 8 张 + 第 9 格 `+1` |
| media 迁移 | 旧 media_uri 行读取正常 |
| 语音 entry | `entry.media?.[0]?.uri` 正常访问 |
| 备份恢复含多图 entry | `restoreEntries` 正确写入 `media_json`，读取后 `entry.media` 为数组 |
| 语音 entry 预加载 | `entry.media?.[0]?.uri` 正常访问 |
| 现有测试 | 全部通过，无回归（测试中 mock 数据更新为数组形式）|

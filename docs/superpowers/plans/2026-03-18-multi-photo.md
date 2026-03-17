# 多图片选择与展示 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持从相册选择最多 9 张照片，以自适应网格显示在卡片中，超出 8 张时最后一格显示 +N。

**Architecture:** 分六个独立任务逐步推进：先将 `Entry.media` 类型改为数组并更新所有访问点（TypeScript 驱动），再添加数据库 `media_json` 列迁移，接着为 `photoService` 开启多选，新建 `PhotoGrid` 组件，最后在 `EntryCard` 集成 PhotoGrid，并更新 FABMenu 和 `handlePhotoSelect` 完成完整多图创建流程。

**Tech Stack:** React Native, TypeScript, Expo SQLite, expo-image-picker, Jest + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-03-18-multi-photo-design.md`

---

### Task 1: Entry 类型改为数组 + 更新所有访问点

**Files:**
- Modify: `app/src/types/entry.ts:14` — `media?: MediaInfo[]`
- Modify: `app/src/store/entryStore.ts:344` — `completeRecording` 包装为数组
- Modify: `app/app/(tabs)/index.tsx:100,104,51` — 语音创建 + 预加载
- Modify: `app/src/components/EntryCard.tsx` — 所有 `entry.media?.xxx` 改为 `entry.media?.[0]?.xxx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx:333` — fixture 改为数组
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx:149,159` — fixtures 改为数组

这是类型重构任务，无新功能，**以现有测试全部通过为验收标准**。

- [ ] **Step 1: 修改 `entry.ts` 中的类型**

将 `app/src/types/entry.ts` 第 14 行：
```ts
// 改前
media?: MediaInfo;

// 改后
media?: MediaInfo[];  // 照片：1–9 项；语音：始终 1 项
```

- [ ] **Step 2: 更新 `entryStore.ts` 中的 `completeRecording`**

`app/src/store/entryStore.ts` 第 344 行：
```ts
// 改前
media: { uri, mimeType: 'audio/m4a', size: 0, duration },

// 改后
media: [{ uri, mimeType: 'audio/m4a', size: 0, duration }],
```

- [ ] **Step 3: 更新 `index.tsx` 中的语音 entry 创建**

`app/app/(tabs)/index.tsx` 第 155 行（voice 录音创建）：
```ts
// 改前
media: { uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 },

// 改后
media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
```

- [ ] **Step 4: 更新 `index.tsx` 中的语音预加载（行 100、104）**

```ts
// 行 100：改前
.filter((e) => e.type === 'voice' && e.media?.uri)
// 行 100：改后
.filter((e) => e.type === 'voice' && e.media?.[0]?.uri)

// 行 104：改前
await VoiceService.preloadAudio(entry.media!.uri)
// 行 104：改后
await VoiceService.preloadAudio(entry.media![0].uri)
```

- [ ] **Step 5: 更新 `EntryCard.tsx` 中所有 `entry.media` 访问点**

以下 6 处逐一修改：

**行 132**（语音文件存在性检查）：
```ts
const uri = entry.media?.[0]?.uri || entry.content;
```

**行 142**（照片文件存在性检查）：
```ts
const uri = entry.media?.[0]?.uri;
```

**行 182**（语音播放）：
```ts
const uri = entry.media?.[0]?.uri || entry.content;
```

**行 390**（语音点击触发播放，判断 media 存在）：
```ts
if (entry.media && entry.media.length > 0 && !isPlayingAudio) {
```

**行 466**（照片内容分支条件）：
```ts
) : entry.type === 'photo' && entry.media?.[0]?.uri ? (
```

**行 481**（Image source）：
```ts
source={{ uri: PhotoService.resolvePhotoUri(entry.media?.[0]?.thumbnail || entry.media![0].uri) }}
```

**行 622–625**（ImageViewer 触发条件 + imageUri）：
```ts
{entry.type === 'photo' && entry.media?.[0]?.uri && (
  <ImageViewer
    ...
    imageUri={entry.media[0].uri}
```

- [ ] **Step 6: 更新 `EntryCard.test.tsx` 中的 photoEntry fixture**

`app/src/components/__tests__/EntryCard.test.tsx` 第 333–338 行的 `photoEntry` 的 `media` 字段：
```ts
// 改前
media: {
  uri: 'file://photo.jpg',
  mimeType: 'image/jpeg',
  size: 1000,
  metadata: { aspectRatio: 1.5, createdAt: Date.now(), modifiedAt: Date.now() },
},

// 改后
media: [{
  uri: 'file://photo.jpg',
  mimeType: 'image/jpeg',
  size: 1000,
  metadata: { aspectRatio: 1.5, createdAt: Date.now(), modifiedAt: Date.now() },
}],
```

- [ ] **Step 7: 更新 `EntryCard.missing-media.test.tsx` 中的 fixtures**

`app/src/components/__tests__/EntryCard.missing-media.test.tsx` 第 149、159 行：
```ts
// photoEntry（行 149）改前
media: { uri: 'file:///missing.jpg', mimeType: 'image/jpeg', size: 0 },
// 改后
media: [{ uri: 'file:///missing.jpg', mimeType: 'image/jpeg', size: 0 }],

// voiceEntry（行 159）改前
media: { uri: 'file:///missing.m4a', mimeType: 'audio/m4a', size: 0, duration: 3000 },
// 改后
media: [{ uri: 'file:///missing.m4a', mimeType: 'audio/m4a', size: 0, duration: 3000 }],
```

- [ ] **Step 8: 运行全量测试，确认无回归**

```bash
cd app && npx jest --testPathPattern="EntryCard" --passWithNoTests
```

预期：全部通过

- [ ] **Step 9: 提交**

```bash
git add app/src/types/entry.ts app/src/store/entryStore.ts app/app/(tabs)/index.tsx app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx app/src/components/__tests__/EntryCard.missing-media.test.tsx
git commit -m "refactor: change Entry.media to MediaInfo array"
```

---

### Task 2: 数据库迁移 — 新增 media_json 列

**Files:**
- Modify: `app/src/database/operations.ts` — 导出 `invalidateColumnCache`，更新 `rowToEntry` / `addEntry` / `updateEntry` / `restoreEntries`
- Modify: `app/src/database/migration.ts` — 新增 `migrateToMediaJson()`
- Modify: `app/src/database/sqlite.ts` — 调用 `migrateToMediaJson()`

- [ ] **Step 1: 在 `operations.ts` 中导出 `invalidateColumnCache`**

在 `app/src/database/operations.ts` 第 111 行（`getTableColumns` 函数）之后、`addEntry` 函数之前，插入导出函数：

```ts
/** 让迁移函数能在新增列后强制刷新列缓存 */
export const invalidateColumnCache = (): void => {
  cachedColumnNames = null;
};
```

- [ ] **Step 2: 更新 `rowToEntry`，从 `media_json` 读取**

将 `app/src/database/operations.ts` 中 `rowToEntry` 函数（第 13–42 行）的 `media` 字段映射改为：

```ts
const rowToEntry = (row: any): Entry => {
  let media: import('@/src/types/entry').MediaInfo[] | undefined = undefined;
  if (row.media_json) {
    try {
      media = JSON.parse(row.media_json);
    } catch {
      media = undefined;
    }
  }

  return {
    id: row.id,
    type: row.type,
    content: row.content,
    timestamp: row.timestamp,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    media,
    recordingStatus: row.recording_status,
    recordingDuration: row.recording_duration,
    syncStatus: 'synced',
  };
};
```

> 注：`migrateToMediaJson()` 会在首次启动时将所有旧 `media_uri` 行迁移为 `media_json`，迁移完成后不再需要读取旧列。迁移完成前的临时窗口内旧行读出 `media = undefined` 是可接受状态（用户将在迁移后重启看到正确数据）。

- [ ] **Step 3: 更新 `addEntry`，写入 `media_json`**

在 `addEntry`（约第 117 行）中，在已有的 `hasMediaColumns` 判断之外，再增加对 `media_json` 列的写入。在获取 `columns` 之后（约第 124 行）：

```ts
const hasMediaJson = columns.has('media_json');
const hasMediaColumns = columns.has('media_thumbnail') && columns.has('media_metadata');
```

若 `hasMediaJson` 为真，INSERT 语句改为只写 `media_json`（忽略旧列）：

```ts
if (hasMediaJson) {
  const mediaJson = entry.media ? JSON.stringify(entry.media) : null;
  await db.runAsync(
    `INSERT INTO entries (
      id, type, content, timestamp, tags,
      media_json,
      recording_status, recording_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, entry.type, entry.content, timestamp,
      entry.tags ? JSON.stringify(entry.tags) : null,
      mediaJson,
      entry.recordingStatus || null, entry.recordingDuration || null,
    ]
  );
} else if (hasMediaColumns) {
  // 旧路径：写独立列（保持不变）
  ...
} else {
  // 最旧路径（保持不变）
  ...
}
```

- [ ] **Step 4: 更新 `updateEntry`，写入 `media_json`**

在 `updateEntry` 中，`updates.media !== undefined` 分支（约第 216 行）：

```ts
if (updates.media !== undefined) {
  if (columns.has('media_json')) {
    fields.push('media_json = ?');
    values.push(JSON.stringify(updates.media));
  } else if (hasMediaColumns) {
    // 旧独立列写入（取第一项，向后兼容）
    const m = Array.isArray(updates.media) ? updates.media[0] : updates.media;
    fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?', 'media_thumbnail = ?', 'media_metadata = ?');
    values.push(m?.uri, m?.mimeType, m?.duration, m?.thumbnail || null, m?.metadata ? JSON.stringify(m.metadata) : null);
  } else {
    const m = Array.isArray(updates.media) ? updates.media[0] : updates.media;
    fields.push('media_uri = ?', 'media_type = ?', 'media_duration = ?');
    values.push(m?.uri, m?.mimeType, m?.duration);
  }
}
```

- [ ] **Step 5: 更新 `restoreEntries`，使用 `media_json`**

`app/src/database/operations.ts` 第 443–490 行 `restoreEntries` 函数。将现有 INSERT 语句替换为：

```ts
// 先检查 media_json 列是否存在
const columns = await getTableColumns(db);
const hasMediaJson = columns.has('media_json');

await db.runAsync(
  hasMediaJson
    ? `INSERT OR IGNORE INTO entries
         (id, type, content, timestamp, tags, media_json,
          recording_status, recording_duration, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    : `INSERT OR IGNORE INTO entries
         (id, type, content, timestamp, tags, media_uri, media_type,
          media_duration, recording_status, recording_duration, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  hasMediaJson
    ? [
        e.id, e.type, e.content, e.timestamp,
        e.tags ? JSON.stringify(e.tags) : null,
        e.media ? JSON.stringify(e.media) : null,
        e.recordingStatus ?? null, e.recordingDuration ?? null,
        e.timestamp, e.editedAt ?? e.timestamp,
      ]
    : [
        e.id, e.type, e.content, e.timestamp,
        e.tags ? JSON.stringify(e.tags) : null,
        e.media?.[0]?.uri ?? null, e.media?.[0]?.mimeType ?? null,
        e.media?.[0]?.duration ?? null,
        e.recordingStatus ?? null, e.recordingDuration ?? null,
        e.timestamp, e.editedAt ?? e.timestamp,
      ]
);
```

注意：`restoreEntries` 内部每条记录用 `withTransactionAsync`，需要在事务外先获取 `columns`，将列名检查移到 for 循环之前。

- [ ] **Step 6: 在 `migration.ts` 新增 `migrateToMediaJson()`**

在 `app/src/database/migration.ts` 文件中：

1. 将顶部已有的 `import * as DB from './operations';` 改为同时导入 `invalidateColumnCache`：
```ts
import * as DB from './operations';
import { invalidateColumnCache } from './operations';
```
（或直接在已有 `import * as DB` 行后新增一行独立 import，不修改已有行）

2. 在文件末尾（`migrateMediaMetadataColumns` 之后）追加：

```ts
/**
 * 新增 media_json 列，将旧 media_uri 行迁移为 JSON 数组
 * 幂等：已迁移则跳过
 */
export const migrateToMediaJson = async (): Promise<void> => {
  if (migrationStore.getString('media_json_migrated') === 'true') return;

  const db = getDatabase();
  try {
    // 添加列（如已存在则跳过）
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(entries)`);
    if (!tableInfo.some(col => col.name === 'media_json')) {
      await db.runAsync(`ALTER TABLE entries ADD COLUMN media_json TEXT`);
      logger.log('✅ 添加 media_json 列');
    }

    // 将现有 media_uri 行转为 JSON 数组
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
      let metadata = undefined;
      if (row.media_metadata) {
        try { metadata = JSON.parse(row.media_metadata); } catch { /* ignore */ }
      }
      const mediaItem = {
        uri: row.media_uri!,
        mimeType: row.media_type ?? 'image/jpeg',
        size: 0,
        duration: row.media_duration ?? undefined,
        thumbnail: row.media_thumbnail ?? undefined,
        metadata,
      };
      await db.runAsync(
        `UPDATE entries SET media_json = ? WHERE id = ?`,
        [JSON.stringify([mediaItem]), row.id]
      );
    }

    // 刷新列缓存，让 operations.ts 的后续写入能感知新列
    invalidateColumnCache();

    migrationStore.set('media_json_migrated', 'true');
    logger.log('✅ media_json 迁移完成，共处理', rows.length, '条记录');
  } catch (error) {
    logger.error('❌ media_json 迁移失败:', error);
  }
};
```

- [ ] **Step 7: 在 `_layout.tsx` 中调用新迁移**

迁移函数实际在 `app/app/_layout.tsx` 中调用（第 19、95–99 行）：

在文件顶部 import 区（第 19 行）追加 `migrateToMediaJson`：
```ts
import { migrateFromAsyncStorage, migrateTagsToNormalized, migrateMediaMetadataColumns, migrateToMediaJson } from '@/src/database/migration';
```

在第 99 行 `await migrateMediaMetadataColumns();` 之后紧接追加：
```ts
await migrateToMediaJson();
```

- [ ] **Step 8: 运行全量测试，确认无回归**

```bash
cd app && npx jest --passWithNoTests
```

预期：全部通过（数据库操作均在内存/mock 环境中，migration 由 MMKV mock 管理）

- [ ] **Step 9: 提交**

```bash
git add app/src/database/operations.ts app/src/database/migration.ts app/app/_layout.tsx
git commit -m "feat: add media_json database column and migration"
```

---

### Task 3: PhotoService 开启多选

**Files:**
- Modify: `app/src/services/photoService.ts:174-178`

- [ ] **Step 1: 更新 `pickPhotoFromLibrary` 的 ImagePicker 选项**

将 `app/src/services/photoService.ts` 第 174 行：
```ts
// 改前
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: options?.allowsEditing ?? false,
  quality: options?.quality ?? 0.95,
});

// 改后
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: true,
  selectionLimit: 9,
  allowsEditing: false,   // 多选模式下不支持裁剪
  quality: options?.quality ?? 0.95,
});
```

- [ ] **Step 2: 运行全量测试，确认无回归**

```bash
cd app && npx jest --passWithNoTests
```

- [ ] **Step 3: 提交**

```bash
git add app/src/services/photoService.ts
git commit -m "feat: enable multi-photo selection (up to 9) in photoService"
```

---

### Task 4: PhotoGrid 组件

**Files:**
- Create: `app/src/components/PhotoGrid.tsx`
- Create: `app/src/components/__tests__/PhotoGrid.test.tsx`

- [ ] **Step 1: 写失败测试**

新建 `app/src/components/__tests__/PhotoGrid.test.tsx`：

```tsx
jest.mock('@/src/services/photoService', () => ({
  PhotoService: { resolvePhotoUri: (uri: string) => uri },
}));
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: any) => <Text>{name}</Text> };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PhotoGrid } from '../PhotoGrid';
import { MediaInfo } from '@/src/types/entry';

const makePhoto = (i: number): MediaInfo => ({
  uri: `file://photo${i}.jpg`,
  mimeType: 'image/jpeg',
  size: 1000,
});

const radius = { borderRadius: 10 };

describe('PhotoGrid', () => {
  it('1 张照片：渲染 photo-image-0，无 grid', () => {
    render(
      <PhotoGrid photos={[makePhoto(0)]} maxPhotoHeight={280} photoImageRadius={radius} />
    );
    expect(screen.getByTestId('photo-image-0')).toBeTruthy();
    expect(screen.queryByTestId('photo-grid')).toBeNull();
  });

  it('2 张照片：渲染 photo-grid，显示 2 个格子', () => {
    const photos = [makePhoto(0), makePhoto(1)];
    render(<PhotoGrid photos={photos} maxPhotoHeight={280} photoImageRadius={radius} />);
    expect(screen.getByTestId('photo-grid')).toBeTruthy();
    expect(screen.getByTestId('photo-cell-0')).toBeTruthy();
    expect(screen.getByTestId('photo-cell-1')).toBeTruthy();
  });

  it('3 张照片：渲染 3 个格子', () => {
    const photos = [makePhoto(0), makePhoto(1), makePhoto(2)];
    render(<PhotoGrid photos={photos} maxPhotoHeight={280} photoImageRadius={radius} />);
    expect(screen.getByTestId('photo-cell-2')).toBeTruthy();
  });

  it('4 张照片：渲染 4 个格子', () => {
    const photos = Array.from({ length: 4 }, (_, i) => makePhoto(i));
    render(<PhotoGrid photos={photos} maxPhotoHeight={280} photoImageRadius={radius} />);
    expect(screen.getByTestId('photo-cell-3')).toBeTruthy();
    expect(screen.queryByTestId('photo-overflow')).toBeNull();
  });

  it('9 张照片：显示 7 格普通 + 第 8 格 overflow (+2)', () => {
    const photos = Array.from({ length: 9 }, (_, i) => makePhoto(i));
    render(<PhotoGrid photos={photos} maxPhotoHeight={280} photoImageRadius={radius} />);
    // 普通格子 0–6
    expect(screen.getByTestId('photo-cell-6')).toBeTruthy();
    // 最后一格是 overflow
    expect(screen.getByTestId('photo-overflow')).toBeTruthy();
    // 溢出数：9 - 7 = 2，显示 +2
    expect(screen.getByText('+2')).toBeTruthy();
    // 第 8 格（index 7）正常格子不存在
    expect(screen.queryByTestId('photo-cell-7')).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest --testPathPattern="PhotoGrid.test" --passWithNoTests
```

预期：FAIL（PhotoGrid 组件不存在）

- [ ] **Step 3: 实现 `PhotoGrid.tsx`**

新建 `app/src/components/PhotoGrid.tsx`：

```tsx
/**
 * PhotoGrid - 自适应照片网格组件
 * 1 张：全宽固定高度；2–3 张：对应列数；4+：3 列网格，最多显示 8 格，超出显示 +N
 */

import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { MediaInfo } from '@/src/types/entry';
import { PhotoService } from '@/src/services/photoService';

const GAP = 3;
const MAX_DISPLAY = 8;

interface PhotoGridProps {
  photos: MediaInfo[];
  maxPhotoHeight: number;
  photoImageRadius: ViewStyle;
  onPhotoPress?: (index: number) => void;
}

export function PhotoGrid({ photos, maxPhotoHeight, photoImageRadius, onPhotoPress }: PhotoGridProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  if (!photos || photos.length === 0) return null;

  // 单张：直接渲染，不用 grid 布局
  if (photos.length === 1) {
    return (
      <PhotoCell
        photo={photos[0]}
        index={0}
        cellSize={maxPhotoHeight}     // 高度 = maxPhotoHeight（全宽由 width:'100%' 控制）
        isFullWidth
        photoImageRadius={photoImageRadius}
        maxPhotoHeight={maxPhotoHeight}
        onPress={() => onPhotoPress?.(0)}
      />
    );
  }

  // 多张：计算列数和格子尺寸
  const numCols = photos.length <= 3 ? photos.length : 3;
  const cellSize = containerWidth > 0
    ? (containerWidth - GAP * (numCols - 1)) / numCols
    : 0;

  // 超出 MAX_DISPLAY 时，显示前 MAX_DISPLAY-1 张 + overflow 格
  const overflow = photos.length > MAX_DISPLAY ? photos.length - (MAX_DISPLAY - 1) : 0;
  const displayPhotos = overflow > 0 ? photos.slice(0, MAX_DISPLAY - 1) : photos;

  return (
    <View
      testID="photo-grid"
      style={styles.grid}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {displayPhotos.map((photo, index) => (
        <PhotoCell
          key={index}
          photo={photo}
          index={index}
          cellSize={cellSize}
          photoImageRadius={{ borderRadius: 4 }}
          maxPhotoHeight={cellSize}
          onPress={() => onPhotoPress?.(index)}
        />
      ))}
      {overflow > 0 && (
        <View
          testID="photo-overflow"
          style={[styles.cell, { width: cellSize, height: cellSize, backgroundColor: 'rgba(0,0,0,0.45)' }]}
        >
          <Text style={styles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

interface PhotoCellProps {
  photo: MediaInfo;
  index: number;
  cellSize: number;
  isFullWidth?: boolean;
  photoImageRadius: ViewStyle;
  maxPhotoHeight: number;
  onPress: () => void;
}

function PhotoCell({ photo, index, cellSize, isFullWidth, photoImageRadius, maxPhotoHeight, onPress }: PhotoCellProps) {
  const [error, setError] = useState(false);

  const imageStyle: ViewStyle & { height: number; width?: string | number } = isFullWidth
    ? { width: '100%', height: maxPhotoHeight }
    : { width: cellSize, height: cellSize };

  if (error) {
    return (
      <View
        testID={`photo-cell-${index}`}
        style={[styles.cell, imageStyle, photoImageRadius, styles.missingCell]}
      />
    );
  }

  return (
    <TouchableOpacity
      testID={`photo-cell-${index}`}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image
        testID={isFullWidth ? 'photo-image-0' : undefined}
        source={{ uri: PhotoService.resolvePhotoUri(photo.thumbnail || photo.uri) }}
        style={[imageStyle, photoImageRadius]}
        resizeMode="cover"
        onError={() => setError(true)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cell: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  missingCell: {
    backgroundColor: '#ECE7E0',
  },
  overflowText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd app && npx jest --testPathPattern="PhotoGrid.test" --passWithNoTests
```

预期：5 个测试全部 PASS

- [ ] **Step 5: 运行全量测试，确认无回归**

```bash
cd app && npx jest --passWithNoTests
```

- [ ] **Step 6: 提交**

```bash
git add app/src/components/PhotoGrid.tsx app/src/components/__tests__/PhotoGrid.test.tsx
git commit -m "feat: add PhotoGrid adaptive grid component"
```

---

### Task 5: EntryCard 集成 PhotoGrid

**Files:**
- Modify: `app/src/components/EntryCard.tsx` — 替换照片渲染逻辑，使用 PhotoGrid
- Modify: `app/src/components/__tests__/EntryCard.test.tsx` — 更新照片相关测试

- [ ] **Step 1: 更新 `EntryCard.test.tsx` 中的照片渲染测试（写新测试，预期失败）**

`EntryCard.test.tsx` 中的 `describe('照片固定高度裁剪显示')` 目前直接断言 `photo-image` testID，PhotoGrid 接管后这些测试需要更新。用 `photo-grid`（多图）或 `photo-image-0`（单图）替换原来的 `photo-image`：

> 注：单张照片时，PhotoGrid 内部渲染 `testID="photo-image-0"` 的 Image，因此已有测试的 `getByTestId('photo-image')` 需改为 `getByTestId('photo-image-0')`。边框圆角、resizeMode、高度的断言逻辑不变。

在 `describe('照片固定高度裁剪显示')` 块内，将所有 `getByTestId('photo-image')` / `screen.getByTestId('photo-image')` 改为 `getByTestId('photo-image-0')` / `screen.getByTestId('photo-image-0')`。

同样，在 `describe('EntryCard photo edge-to-edge')` 中，所有 `screen.getByTestId('photo-image')` 改为 `screen.getByTestId('photo-image-0')`。

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest --testPathPattern="EntryCard.test" --passWithNoTests
```

预期：FAIL（`photo-image-0` testID 不存在，EntryCard 还未使用 PhotoGrid）

- [ ] **Step 3: 在 `EntryCard.tsx` 中引入 PhotoGrid 并替换照片渲染**

在 `app/src/components/EntryCard.tsx` 顶部 import 区加入：
```ts
import { PhotoGrid } from './PhotoGrid';
```

找到约第 466 行的照片分支（`entry.type === 'photo' && entry.media?.[0]?.uri`），将整段替换为：

```tsx
) : entry.type === 'photo' && entry.media && entry.media.length > 0 ? (
  // 照片内容 — 使用 PhotoGrid 自适应网格
  <>
    <PhotoGrid
      photos={entry.media}
      maxPhotoHeight={maxPhotoHeight}
      photoImageRadius={photoImageRadius}
      onPhotoPress={(_index) => handleImagePress()}
    />
    {entry.content && (
      <Text style={styles.photoCaption} numberOfLines={isExpanded ? undefined : 2}>
        {entry.content}
      </Text>
    )}
  </>
```

> 说明：`photoError` 状态和 `photo-missing` View 已移入 PhotoGrid 内部（每个 Cell 独立管理错误状态）；原 EntryCard 里的 `photoError` state 和相关 useEffect 可一并删除。`thumbnailRef` 也不再需要（ImageViewer 将暂时用第一张图 URI 触发，后续可扩展）。

同时，ImageViewer 触发（约第 622 行）改为通过 `handleImagePress` 控制，保持现有 `showImageViewer` 状态逻辑，使用 `entry.media[0].uri` 作为预览 URI：

```tsx
{entry.type === 'photo' && entry.media?.[0]?.uri && (
  <ImageViewer
    visible={showImageViewer}
    imageUri={entry.media[0].uri}
    ...
  />
)}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd app && npx jest --testPathPattern="EntryCard" --passWithNoTests
```

预期：全部通过

- [ ] **Step 5: 提交**

```bash
git add app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: integrate PhotoGrid into EntryCard for multi-photo display"
```

---

### Task 6: FABMenu + index.tsx 多图创建流程

**Files:**
- Modify: `app/src/components/FABMenu.tsx:73,142-149` — `onSelect` 类型 + camera/library 分支
- Modify: `app/app/(tabs)/index.tsx:25-64,135-145` — `handlePhotoSelect` + `handlePhotoSelectForTest`

- [ ] **Step 1: 写失败测试 — handlePhotoSelectForTest 多图**

在 `app/app/(tabs)/index.tsx` 文件对应的测试（如果存在测试文件则追加，否则新建 `app/app/(tabs)/__tests__/index.test.ts`）：

```ts
import { handlePhotoSelectForTest, PhotoSelectDeps } from '../index';
import { PhotoResult } from '@/src/services/photoService';

const mockSave = jest.fn().mockResolvedValue({
  originalUri: 'file://saved.jpg',
  thumbnailUri: 'file://thumb.jpg',
  aspectRatio: 1.5,
  width: 1200,
  height: 800,
});
const mockAddEntry = jest.fn().mockResolvedValue(undefined);
const deps: PhotoSelectDeps = {
  savePhotoToStorage: mockSave,
  addEntry: mockAddEntry,
};

const makeResult = (n: number): PhotoResult => ({
  uri: `file://photo${n}.jpg`,
  width: 1200, height: 800, aspectRatio: 1.5,
});

describe('handlePhotoSelectForTest', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('单张照片：addEntry 收到 media 数组长度为 1', async () => {
    await handlePhotoSelectForTest([makeResult(0)], deps);
    expect(mockSave).toHaveBeenCalledTimes(1);
    const call = mockAddEntry.mock.calls[0][0];
    expect(call.media).toHaveLength(1);
    expect(call.media[0].uri).toBe('file://saved.jpg');
  });

  it('3 张照片：addEntry 收到 media 数组长度为 3，savePhotoToStorage 调用 3 次', async () => {
    await handlePhotoSelectForTest([makeResult(0), makeResult(1), makeResult(2)], deps);
    expect(mockSave).toHaveBeenCalledTimes(3);
    const call = mockAddEntry.mock.calls[0][0];
    expect(call.media).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest --testPathPattern="index.test" --passWithNoTests
```

预期：FAIL（`handlePhotoSelectForTest` 签名仍为单个 `PhotoResult`）

- [ ] **Step 3: 更新 `index.tsx` 中的 `PhotoSelectDeps` 和 `handlePhotoSelectForTest`**

`app/app/(tabs)/index.tsx` 第 25–64 行：

```ts
// PhotoSelectDeps.addEntry 的 media 字段改为数组
export interface PhotoSelectDeps {
  savePhotoToStorage: (
    sourceUri: string,
    fileId: string,
    quality: 'low' | 'medium' | 'high',
    aspectRatio?: number
  ) => Promise<import('@/src/services/photoService').SavedPhotoResult>;
  addEntry: (entry: Omit<import('@/src/types/entry').Entry, 'id' | 'timestamp'>) => Promise<void>;
}

// handlePhotoSelectForTest：接收 PhotoResult[]
export async function handlePhotoSelectForTest(
  results: import('@/src/services/photoService').PhotoResult[],
  deps: PhotoSelectDeps
): Promise<void> {
  const mediaList: import('@/src/types/entry').MediaInfo[] = [];
  for (const result of results) {
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const savedPhoto = await deps.savePhotoToStorage(result.uri, fileId, 'medium', result.aspectRatio);
    mediaList.push({
      uri: savedPhoto.originalUri,
      mimeType: 'image/jpeg',
      size: 0,
      thumbnail: savedPhoto.thumbnailUri,
      metadata: {
        width: savedPhoto.width,
        height: savedPhoto.height,
        aspectRatio: savedPhoto.aspectRatio,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
    });
  }
  await deps.addEntry({
    type: 'photo',
    content: '',
    syncStatus: 'pending',
    media: mediaList,
  });
}
```

- [ ] **Step 4: 更新 `handleMediaSelect` 中的 photo 分支**

`app/app/(tabs)/index.tsx` 第 135–145 行：

```ts
// 原签名（改前）
const handleMediaSelect = useCallback(async (
  type: 'text' | 'photo' | 'voice',
  photoResult?: PhotoResult
) => {

// 改后
const handleMediaSelect = useCallback(async (
  type: 'text' | 'photo' | 'voice',
  photoResults?: PhotoResult[]
) => {
  switch (type) {
    case 'photo':
      if (photoResults && photoResults.length > 0) {
        await handlePhotoSelectForTest(photoResults, {
          savePhotoToStorage: PhotoService.savePhotoToStorage.bind(PhotoService),
          addEntry,
        });
      }
      break;
    // ... 其余分支不变
  }
```

- [ ] **Step 5: 更新 `FABMenu.tsx` 中的 `onSelect` 类型与分支**

`app/src/components/FABMenu.tsx`：

**接口（第 72–74 行）：**
```ts
// 改前
interface FABMenuProps {
  onSelect: (type: 'text' | 'photo' | 'voice', photoResult?: PhotoResult) => void;

// 改后
interface FABMenuProps {
  onSelect: (type: 'text' | 'photo' | 'voice', photos?: PhotoResult[]) => void;
```

**camera 分支（第 139–143 行）：**
```ts
// 改前
const photo = await PhotoService.takePhoto();
if (photo) onSelectRef.current('photo', photo);

// 改后
const photo = await PhotoService.takePhoto();
if (photo) onSelectRef.current('photo', [photo]);
```

**photo（相册）分支（第 144–149 行）：**
```ts
// 改前
const result = await PhotoService.pickPhotoFromLibrary();
const photo = result[0];
if (photo) onSelectRef.current('photo', photo);

// 改后
const result = await PhotoService.pickPhotoFromLibrary();
if (result.length > 0) onSelectRef.current('photo', result);
```

- [ ] **Step 6: 运行所有测试，确认通过**

```bash
cd app && npx jest --passWithNoTests
```

预期：全部通过

- [ ] **Step 7: 提交**

```bash
git add app/src/components/FABMenu.tsx app/app/(tabs)/index.tsx "app/app/(tabs)/__tests__/index.test.ts"
git commit -m "feat: multi-photo selection flow — FABMenu passes PhotoResult[] to handlePhotoSelect"
```

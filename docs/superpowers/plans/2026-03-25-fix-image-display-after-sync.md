# Fix Image Display After Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复云端同步/恢复后图片无法显示的 7 个 bug，以及 ZIP 备份多图丢失问题。

**Architecture:** 问题根源是云端下发的 `media[].uri` 保留了来源设备的本地路径，在当前设备上无效。修复分三层：(1) 显示层优先级修正；(2) 接收时数据归一化；(3) 发送时 payload 净化。同时修复 ZIP 备份/恢复只处理第一张图的问题。

**Tech Stack:** TypeScript, Expo SQLite, Zustand, Jest (jest-expo)

---

## 文件改动地图

| 文件 | 改动 |
|------|------|
| `app/src/services/photoService.ts` | Bug 1: 修正 thumbnail 候选 URI 顺序 |
| `app/src/utils/mediaUtils.ts` | 新建：提取 `normalizeCloudMediaItem` 共享工具函数 |
| `app/src/services/syncBootstrapService.ts` | Bug 2: 恢复时归一化 media URI |
| `app/src/services/cloudSyncService.ts` | Bug 3 + 7: 接收时归一化 + 发送时净化本地路径 |
| `app/src/services/backupService.ts` | Bug 4 + 5: 处理所有 media 项；保留云端 remoteUri |
| `app/src/services/syncService.ts` | Bug 6: extractMediaFromZip 正确处理 MediaInfo[] |

| 测试文件 | 覆盖 |
|---------|------|
| `app/src/services/__tests__/photoService.test.ts` | Bug 1 |
| `app/src/utils/__tests__/mediaUtils.test.ts` | 共享工具函数 |
| `app/src/services/__tests__/syncBootstrapService.test.ts` | Bug 2 |
| `app/src/services/__tests__/cloudSyncService.test.ts` | Bug 3 + 7 |
| `app/src/services/__tests__/backupService.test.ts` | Bug 4 + 5 |

---

## Task 1: 修正 thumbnail URI 候选顺序（Bug 1）

**Files:**
- Modify: `app/src/services/photoService.ts:98`
- Test: `app/src/services/__tests__/photoService.test.ts`

- [ ] **Step 1: 写失败测试**

在 `photoService.test.ts` 中找到 `getPreferredPhotoUri` 相关 describe，添加：

```typescript
it('thumbnail: prefers remoteUri over stale local uri when thumbnail fields are absent', () => {
  const media = {
    uri: 'file:///old-device/media/photos/original/photo.jpg',
    remoteUri: 'https://cdn.example.com/photo.jpg',
    thumbnail: undefined as string | undefined,
    remoteThumbnail: undefined as string | undefined,
    mimeType: 'image/jpeg',
    size: 1000,
  };
  const result = PhotoService.getPreferredPhotoUri(media, 'thumbnail');
  expect(result).toBe('https://cdn.example.com/photo.jpg');
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd app && npx jest photoService.test --no-coverage 2>&1 | tail -20
```

Expected: FAIL — 返回了本地路径而非 remoteUri

- [ ] **Step 3: 修改候选顺序**

`app/src/services/photoService.ts` 第 98-101 行：

```typescript
// 修改前：
const rawCandidates = kind === 'thumbnail'
  ? [media.thumbnail, media.remoteThumbnail, media.uri, media.remoteUri]
  : [media.remoteUri, media.uri];

// 修改后：
const rawCandidates = kind === 'thumbnail'
  ? [media.thumbnail, media.remoteThumbnail, media.remoteUri, media.uri]
  : [media.remoteUri, media.uri];
```

- [ ] **Step 4: 运行确认通过**

```bash
cd app && npx jest photoService.test --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd app && git add src/services/photoService.ts src/services/__tests__/photoService.test.ts
git commit -m "fix(photo): prefer remoteUri over stale local uri for thumbnail display"
```

---

## Task 2: 提取共享归一化工具函数

**Files:**
- Create: `app/src/utils/mediaUtils.ts`
- Create: `app/src/utils/__tests__/mediaUtils.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `app/src/utils/__tests__/mediaUtils.test.ts`：

```typescript
import { normalizeCloudMediaItem } from '../mediaUtils';
import type { MediaInfo } from '@/src/types/entry';

const base: MediaInfo = {
  uri: '',
  mimeType: 'image/jpeg',
  size: 1000,
};

describe('normalizeCloudMediaItem', () => {
  it('replaces stale file:// uri with remoteUri', () => {
    const item: MediaInfo = {
      ...base,
      uri: 'file:///old-device/media/photos/original/photo.jpg',
      remoteUri: 'https://cdn.example.com/photo.jpg',
    };
    expect(normalizeCloudMediaItem(item).uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('replaces stale absolute path uri with remoteUri', () => {
    const item: MediaInfo = {
      ...base,
      uri: '/var/mobile/Containers/Data/Application/OLD/photo.jpg',
      remoteUri: 'https://cdn.example.com/photo.jpg',
    };
    expect(normalizeCloudMediaItem(item).uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('keeps uri unchanged when no remoteUri', () => {
    const item: MediaInfo = {
      ...base,
      uri: 'file:///old-device/photo.jpg',
    };
    expect(normalizeCloudMediaItem(item).uri).toBe('file:///old-device/photo.jpg');
  });

  it('keeps uri unchanged when uri is already a remote URL', () => {
    const item: MediaInfo = {
      ...base,
      uri: 'https://cdn.example.com/photo.jpg',
      remoteUri: 'https://cdn.example.com/photo.jpg',
    };
    expect(normalizeCloudMediaItem(item).uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('preserves all other fields', () => {
    const item: MediaInfo = {
      ...base,
      uri: 'file:///old/photo.jpg',
      remoteUri: 'https://cdn.example.com/photo.jpg',
      thumbnail: 'file:///old/thumb.jpg',
      remoteThumbnail: 'https://cdn.example.com/thumb.jpg',
    };
    const result = normalizeCloudMediaItem(item);
    expect(result.remoteUri).toBe('https://cdn.example.com/photo.jpg');
    expect(result.thumbnail).toBe('file:///old/thumb.jpg');
    expect(result.remoteThumbnail).toBe('https://cdn.example.com/thumb.jpg');
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd app && npx jest mediaUtils.test --no-coverage 2>&1 | tail -20
```

Expected: FAIL — 文件不存在

- [ ] **Step 3: 创建工具函数**

新建 `app/src/utils/mediaUtils.ts`：

```typescript
import type { MediaInfo } from '@/src/types/entry';

/**
 * 归一化从云端接收的 MediaInfo 项。
 * 当 uri 是来源设备的本地路径（file:// 或绝对路径）且 remoteUri 存在时，
 * 将 uri 替换为 remoteUri，确保在当前设备上可以正常显示。
 */
export function normalizeCloudMediaItem(item: MediaInfo): MediaInfo {
  const isLocalPath =
    item.uri.startsWith('file://') ||
    (item.uri.startsWith('/') && !item.uri.startsWith('//'));

  if (isLocalPath && item.remoteUri) {
    return { ...item, uri: item.remoteUri };
  }
  return item;
}
```

- [ ] **Step 4: 运行确认通过**

```bash
cd app && npx jest mediaUtils.test --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd app && git add src/utils/mediaUtils.ts src/utils/__tests__/mediaUtils.test.ts
git commit -m "feat(utils): add normalizeCloudMediaItem shared helper"
```

---

## Task 3: Bootstrap 恢复时归一化 media URI（Bug 2）

**Files:**
- Modify: `app/src/services/syncBootstrapService.ts`
- Test: `app/src/services/__tests__/syncBootstrapService.test.ts`

- [ ] **Step 1: 写失败测试**

在 `syncBootstrapService.test.ts` 中添加：

```typescript
it('normalizes stale local uri to remoteUri when restoring from cloud', async () => {
  const cloudEntry = {
    id: 'entry1',
    type: 'photo' as const,
    content: '',
    media: [
      {
        uri: 'file:///old-device/media/photos/original/photo.jpg',
        remoteUri: 'https://cdn.example.com/photo.jpg',
        mimeType: 'image/jpeg',
        size: 1000,
      },
    ],
    syncStatus: 'synced' as const,
    timestamp: Date.now(),
    updatedAt: Date.now(),
  };
  mockApiGet.mockResolvedValueOnce([cloudEntry]);

  const service = createSyncBootstrapService();
  await service.runInitialFlow('cloud');

  const restoredEntries = (DB.restoreEntries as jest.Mock).mock.calls[0][0];
  expect(restoredEntries[0].media[0].uri).toBe('https://cdn.example.com/photo.jpg');
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd app && npx jest syncBootstrapService.test --no-coverage 2>&1 | tail -20
```

Expected: FAIL — uri 仍是旧设备本地路径

- [ ] **Step 3: 在 normalizeImportedMedia 中应用归一化**

在 `app/src/services/syncBootstrapService.ts` 顶部添加 import：

```typescript
import { normalizeCloudMediaItem } from '@/src/utils/mediaUtils';
```

修改 `normalizeImportedMedia` 函数，在 return 前对每个 item 应用归一化：

```typescript
function normalizeImportedMedia(media: unknown): MediaInfo[] {
  // ... 现有解析逻辑不变 ...
  // 在所有 return 语句中，将返回的数组 map 一次：
  // 例如原来 return media.filter(...) 改为 return media.filter(...).map(normalizeCloudMediaItem)
}
```

具体：找到 `normalizeImportedMedia` 中所有 `return` 返回数组的地方，在末尾加 `.map(normalizeCloudMediaItem)`。

- [ ] **Step 4: 运行确认通过**

```bash
cd app && npx jest syncBootstrapService.test --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd app && git add src/services/syncBootstrapService.ts src/services/__tests__/syncBootstrapService.test.ts
git commit -m "fix(sync): normalize stale local media uri to remoteUri on cloud bootstrap restore"
```

---

## Task 4: 增量同步接收归一化 + 发送净化（Bug 3 + 7）

**Files:**
- Modify: `app/src/services/cloudSyncService.ts`
- Test: `app/src/services/__tests__/cloudSyncService.test.ts`

- [ ] **Step 1: 写失败测试**

在 `cloudSyncService.test.ts` 中添加两个测试：

```typescript
// Bug 3: 接收时归一化
it('normalizes stale local media uri to remoteUri when applying server changes', async () => {
  const serverChange = {
    changeId: 1,
    op: 'create' as const,
    entry: {
      id: 'entry-photo-1',
      type: 'photo' as const,
      content: '',
      media: JSON.stringify([
        {
          uri: 'file:///old-device/media/photos/original/photo.jpg',
          remoteUri: 'https://cdn.example.com/photo.jpg',
          mimeType: 'image/jpeg',
          size: 1000,
        },
      ]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // mock syncNow response
  mockApiPost.mockResolvedValueOnce({
    newCursor: 1,
    results: [],
    serverChanges: [serverChange],
    conflicts: [],
  });

  const service = createCloudSyncService();
  await service.syncNow();

  const savedEntry = (DB.restoreEntries as jest.Mock).mock.calls[0]?.[0]?.[0]
    ?? (DB.updateEntry as jest.Mock).mock.calls[0]?.[1];
  expect(savedEntry?.media?.[0]?.uri).toBe('https://cdn.example.com/photo.jpg');
});

// Bug 7: 发送时净化
it('sends remoteUri as uri in server payload when remoteUri exists', async () => {
  const pendingEntry = {
    id: 'entry-photo-2',
    type: 'photo' as const,
    content: '',
    media: [
      {
        uri: 'file:///current-device/media/photos/original/photo.jpg',
        remoteUri: 'https://cdn.example.com/photo.jpg',
        mimeType: 'image/jpeg',
        size: 1000,
      },
    ],
    syncStatus: 'pending' as const,
    syncOp: 'create' as const,
    timestamp: Date.now(),
    updatedAt: Date.now(),
    baseUpdatedAt: Date.now(),
  };

  (DB.getEntriesBySyncStatus as jest.Mock).mockResolvedValueOnce([pendingEntry]);
  mockApiPost.mockResolvedValueOnce({
    newCursor: 1,
    results: [{ changeId: `${pendingEntry.id}:create:${pendingEntry.updatedAt}`, status: 'applied', entryId: pendingEntry.id }],
    serverChanges: [],
    conflicts: [],
  });

  const service = createCloudSyncService();
  await service.syncNow();

  const sentBody = mockApiPost.mock.calls[0][1];
  const sentMedia = JSON.parse(sentBody.clientChanges[0].entry.media);
  expect(sentMedia[0].uri).toBe('https://cdn.example.com/photo.jpg');
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd app && npx jest cloudSyncService.test --no-coverage 2>&1 | tail -20
```

Expected: 两个新测试 FAIL

- [ ] **Step 3: 修复 mapServerEntryToLocal（Bug 3）**

在 `app/src/services/cloudSyncService.ts` 顶部添加 import：

```typescript
import { normalizeCloudMediaItem } from '@/src/utils/mediaUtils';
```

在 `mapServerEntryToLocal` 函数中，修改 media 赋值：

```typescript
// 修改前：
media: parseMedia(serverEntry.media, existing?.media),

// 修改后：
media: parseMedia(serverEntry.media, existing?.media).map(normalizeCloudMediaItem),
```

- [ ] **Step 4: 修复 mapEntryToServer（Bug 7）**

在 `cloudSyncService.ts` 中修改 `mapEntryToServer`：

```typescript
function mapEntryToServer(entry: Entry) {
  return {
    id: entry.id,
    type: entry.type,
    content: entry.content,
    tags: JSON.stringify(entry.tags ?? []),
    media: JSON.stringify(
      (entry.media ?? []).map((item) => ({
        ...item,
        // 发送给服务器时，用 remoteUri 替换本地路径，避免污染其他设备
        uri: item.remoteUri ?? item.uri,
        thumbnail: item.remoteThumbnail ?? item.thumbnail,
      }))
    ),
    recordingStatus: entry.recordingStatus ?? null,
    recordingDuration: entry.recordingDuration ?? null,
    createdAt: entry.timestamp ? new Date(entry.timestamp).toISOString() : undefined,
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : undefined,
    syncStatus: entry.syncStatus,
  };
}
```

- [ ] **Step 5: 运行确认通过**

```bash
cd app && npx jest cloudSyncService.test --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd app && git add src/services/cloudSyncService.ts src/services/__tests__/cloudSyncService.test.ts
git commit -m "fix(sync): normalize media uri on receive and strip local uri from server payload"
```

---

## Task 5: ZIP 备份处理所有 media 项 + 保留 remoteUri（Bug 4 + 5）

**Files:**
- Modify: `app/src/services/backupService.ts`
- Test: `app/src/services/__tests__/backupService.test.ts`

- [ ] **Step 1: 写失败测试**

在 `backupService.test.ts` 中添加：

```typescript
// Bug 4: 多图备份
it('backs up all media items, not just the first', async () => {
  const FileSystem = require('expo-file-system/legacy');
  FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 500 });
  FileSystem.readAsStringAsync.mockResolvedValue('base64data');

  const entries: Entry[] = [
    {
      id: 'e1',
      type: 'photo',
      content: '',
      timestamp: Date.now(),
      syncStatus: 'synced',
      syncOp: 'update',
      media: [
        { uri: 'file:///app/media/photos/original/photo1.jpg', mimeType: 'image/jpeg', size: 500 },
        { uri: 'file:///app/media/photos/original/photo2.jpg', mimeType: 'image/jpeg', size: 500 },
      ],
    },
  ];

  await BackupService.createBackup(entries);

  // zip.file 应被调用两次（两张图）+ data.json + manifest.json
  const mediaCalls = mockZipInstance.file.mock.calls.filter(
    ([name]: [string]) => name.startsWith('media/')
  );
  expect(mediaCalls).toHaveLength(2);
});

// Bug 5: 云端恢复的 entry 备份时保留 remoteUri
it('preserves remoteUri in export when local file does not exist', async () => {
  const FileSystem = require('expo-file-system/legacy');
  FileSystem.getInfoAsync.mockResolvedValue({ exists: false });

  const entries: Entry[] = [
    {
      id: 'e2',
      type: 'photo',
      content: '',
      timestamp: Date.now(),
      syncStatus: 'synced',
      syncOp: 'update',
      media: [
        {
          uri: 'https://cdn.example.com/photo.jpg', // 已归一化为 remoteUri
          remoteUri: 'https://cdn.example.com/photo.jpg',
          mimeType: 'image/jpeg',
          size: 500,
        },
      ],
    },
  ];

  await BackupService.createBackup(entries);

  const dataJsonCall = mockZipInstance.file.mock.calls.find(
    ([name]: [string]) => name === 'data.json'
  );
  const data = JSON.parse(dataJsonCall[1]);
  expect(data.entries[0].media[0].remoteUri).toBe('https://cdn.example.com/photo.jpg');
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd app && npx jest backupService.test --no-coverage 2>&1 | tail -20
```

Expected: FAIL

- [ ] **Step 3: 重构 createBackup 的 media 处理逻辑**

在 `app/src/services/backupService.ts` 中，将 `createBackup` 里的 media 处理从单项改为循环所有项：

```typescript
const exportEntries = await Promise.all(
  entries.map(async (e) => {
    const mediaExports: Record<string, unknown>[] = [];

    for (const mediaItem of e.media ?? []) {
      if (!mediaItem.uri) continue;

      try {
        const resolvedUri =
          e.type === 'voice'
            ? VoiceService.resolveAudioUri(mediaItem.uri)
            : PhotoService.resolvePhotoUri(mediaItem.uri);

        const fileInfo = await FileSystem.getInfoAsync(resolvedUri);

        if (fileInfo.exists) {
          const fname = resolvedUri.split('/').pop()!;
          const base64 = await FileSystem.readAsStringAsync(resolvedUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          zip.file(`media/${fname}`, base64, { base64: true });
          mediaFiles.push(fname);
          mediaExports.push({
            ...mediaItem,
            relativeUri: `media/${fname}`,
          });
        } else if (mediaItem.remoteUri) {
          // 本地文件不存在（云端恢复的 entry），保留 remoteUri 供恢复后显示
          mediaExports.push({ ...mediaItem });
        } else {
          mediaExports.push({ mimeType: mediaItem.mimeType, size: mediaItem.size });
        }
      } catch {
        if (mediaItem.remoteUri) {
          mediaExports.push({ ...mediaItem });
        } else {
          mediaExports.push({ mimeType: mediaItem.mimeType, size: mediaItem.size });
        }
      }
    }

    return {
      id: e.id,
      type: e.type,
      content: e.content,
      tags: e.tags ?? [],
      timestamp: e.timestamp,
      transcription: e.transcription,
      media: mediaExports.length > 0 ? mediaExports : undefined,
    };
  })
);
```

- [ ] **Step 4: 运行确认通过**

```bash
cd app && npx jest backupService.test --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd app && git add src/services/backupService.ts src/services/__tests__/backupService.test.ts
git commit -m "fix(backup): handle all media items and preserve remoteUri for cloud-restored entries"
```

---

## Task 6: ZIP 恢复正确处理 MediaInfo[]（Bug 6）

**Files:**
- Modify: `app/src/services/syncService.ts`

> 注意：syncService 目前无独立测试文件，逻辑通过 backupService 集成测试覆盖。

- [ ] **Step 1: 直接修改 extractMediaFromZip**

在 `app/src/services/syncService.ts` 中，将 `extractMediaFromZip` 从单对象处理改为数组处理：

```typescript
static async extractMediaFromZip(
  zip: JSZip,
  entries: BackupData['entries']
): Promise<BackupData['entries']> {
  return Promise.all(
    entries.map(async (e) => {
      // 兼容旧格式（单对象）和新格式（数组）
      const mediaArray: any[] = Array.isArray(e.media)
        ? e.media
        : e.media
        ? [e.media]
        : [];

      if (mediaArray.length === 0) return e;

      const processedMedia = await Promise.all(
        mediaArray.map(async (mediaItem: any) => {
          if (!mediaItem?.relativeUri) {
            // 无本地文件可提取，保留原样（remoteUri 仍可用于显示）
            return mediaItem;
          }

          const zipFile = zip.file(mediaItem.relativeUri as string);
          if (!zipFile) {
            logger.warn(`[restore] ZIP 中找不到媒体文件: ${mediaItem.relativeUri}`);
            return { ...mediaItem, uri: mediaItem.remoteUri ?? mediaItem.uri };
          }

          try {
            const base64 = await zipFile.async('base64');
            const filename = (mediaItem.relativeUri as string).split('/').pop()!;
            const mediaPaths = getMediaPaths();
            const targetDir =
              e.type === 'voice' ? mediaPaths.voiceOriginal : mediaPaths.photoOriginal;

            const dirInfo = await FileSystem.getInfoAsync(targetDir);
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
            }

            const targetUri = `${targetDir}${filename}`;
            await FileSystem.writeAsStringAsync(targetUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            logger.log(`[restore] 媒体文件已恢复: ${filename}`);
            return { ...mediaItem, uri: targetUri };
          } catch (err) {
            logger.warn(`[restore] 无法恢复媒体文件 ${mediaItem.relativeUri}:`, err);
            return { ...mediaItem, uri: mediaItem.remoteUri ?? mediaItem.uri };
          }
        })
      );

      return { ...e, media: processedMedia };
    })
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/services/syncService.ts
git commit -m "fix(sync): handle MediaInfo array in extractMediaFromZip, restore all media items"
```

---

## Task 7: 全量测试验证

- [ ] **Step 1: 运行所有受影响的测试**

```bash
cd app && npx jest --testPathPattern="photoService|mediaUtils|syncBootstrapService|cloudSyncService|backupService" --no-coverage 2>&1 | tail -30
```

Expected: 全部 PASS

- [ ] **Step 2: 运行完整测试套件**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -30
```

Expected: 无回归

- [ ] **Step 3: 查看提交历史**

```bash
git log --oneline -8
```

Expected: 看到 6 个新 commit，每个对应一个 bug fix

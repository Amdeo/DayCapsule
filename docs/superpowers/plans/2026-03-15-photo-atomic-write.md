# 照片原子写入修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Android 重启后照片消失的 bug：将 `handlePhotoSelect` 改为先持久化文件再写 DB，消除临时 URI 进入数据库的可能。

**Architecture:** `handlePhotoSelect`（`app/app/(tabs)/index.tsx`）当前是三步写入（addEntry 临时 URI → savePhotoToStorage → updateEntry 持久 URI）。修复后变为两步：预生成 fileId → savePhotoToStorage → 单次 addEntry（持久 URI）。为便于测试，将核心逻辑提取为 `handlePhotoSelectForTest` 纯函数并导出，该函数通过 `deps` 注入所有副作用，实现完全隔离。

**Tech Stack:** React Native, Expo SDK 54, TypeScript, Jest

---

## Chunk 1: 重写 handlePhotoSelect

### Task 1: 重写 handlePhotoSelect 为原子写入，附带纯函数测试

**Files:**
- Modify: `app/app/(tabs)/index.tsx:191-240`
- Create: `app/app/(tabs)/__tests__/index.photo.test.ts`

---

- [ ] **Step 1: 写失败测试（最终版本）**

新建 `app/app/(tabs)/__tests__/index.photo.test.ts`：

```ts
import { Alert } from 'react-native';
import { handlePhotoSelectForTest, PhotoSelectDeps } from '../index';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PHOTO_RESULT = {
  uri: 'content://media/external/images/1234',
  width: 3024,
  height: 4032,
  aspectRatio: 3024 / 4032,
};

const PERSISTENT_URI =
  'file:///data/user/0/com.app/files/media/photos/original/photo_123.jpg';

const THUMBNAIL_URI =
  'file:///data/user/0/com.app/files/media/photos/original/thumb_123.jpg';

const SAVED_PHOTO = {
  originalUri: PERSISTENT_URI,
  thumbnailUri: THUMBNAIL_URI,
  aspectRatio: PHOTO_RESULT.aspectRatio,
  width: PHOTO_RESULT.width,
  height: PHOTO_RESULT.height,
};

function makeDeps(overrides: Partial<PhotoSelectDeps> = {}): PhotoSelectDeps {
  return {
    savePhotoToStorage: jest.fn().mockResolvedValue(SAVED_PHOTO),
    addEntry: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('handlePhotoSelectForTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('savePhotoToStorage 失败时不调用 addEntry', async () => {
    const deps = makeDeps({
      savePhotoToStorage: jest.fn().mockRejectedValue(new Error('disk full')),
    });

    await expect(handlePhotoSelectForTest(PHOTO_RESULT, deps)).rejects.toThrow('disk full');

    expect(deps.addEntry).not.toHaveBeenCalled();
  });

  it('addEntry 收到持久化 URI，不含 content:// 前缀', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest(PHOTO_RESULT, deps);

    expect(deps.addEntry).toHaveBeenCalledTimes(1);
    const callArg = (deps.addEntry as jest.Mock).mock.calls[0][0];
    expect(callArg.media.uri).toBe(PERSISTENT_URI);
    expect(callArg.media.uri).not.toContain('content://');
    expect(callArg.media.uri).not.toContain('cache');
  });

  it('addEntry 只被调用一次（无 updateEntry 第二步）', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest(PHOTO_RESULT, deps);

    expect(deps.addEntry).toHaveBeenCalledTimes(1);
    // deps 中没有 updateEntry，如果实现里调用了 updateEntry 会在 TS 编译时报错
  });

  it('savePhotoToStorage 的参数不包含相机临时 URI 作为最终存储路径', async () => {
    const deps = makeDeps();

    await handlePhotoSelectForTest(PHOTO_RESULT, deps);

    // savePhotoToStorage 接收 sourceUri（临时路径）是正常的，但 addEntry 不应该用它
    expect((deps.savePhotoToStorage as jest.Mock).mock.calls[0][0]).toBe(PHOTO_RESULT.uri);
    const addCallArg = (deps.addEntry as jest.Mock).mock.calls[0][0];
    expect(addCallArg.media.uri).not.toBe(PHOTO_RESULT.uri); // 不能是临时路径
  });
});
```

- [ ] **Step 2: 运行测试，确认因缺少导出而失败**

```bash
cd app && npx jest "app/app/\(tabs\)/__tests__/index.photo.test.ts" --no-coverage 2>&1 | tail -15
```

预期：编译错误或 `handlePhotoSelectForTest` / `PhotoSelectDeps` 未导出导致 FAIL。

- [ ] **Step 3: 实现 — 导出纯函数 + 重写 handlePhotoSelect**

修改 `app/app/(tabs)/index.tsx`：

**3a. 在文件顶部 import 区之后，`export default function HomeScreen()` 之前，添加类型和纯函数导出：**

```ts
import { PhotoResult, PhotoService, SavedPhotoResult } from '@/src/services/photoService';

// ─── 照片保存纯函数（供测试注入依赖）─────────────────────────────────────────
export interface PhotoSelectDeps {
  savePhotoToStorage: (
    sourceUri: string,
    fileId: string,
    quality: 'low' | 'medium' | 'high',
    aspectRatio: number
  ) => Promise<SavedPhotoResult>;
  addEntry: (entry: Omit<import('@/src/types/entry').Entry, 'id' | 'timestamp'>) => Promise<void>;
}

export async function handlePhotoSelectForTest(
  result: PhotoResult,
  deps: PhotoSelectDeps
): Promise<void> {
  const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const savedPhoto = await deps.savePhotoToStorage(
    result.uri,
    fileId,
    'medium',
    result.aspectRatio
  );
  await deps.addEntry({
    type: 'photo',
    content: '',
    syncStatus: 'pending',
    media: {
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
    },
  });
}
```

**3b. 将 `handlePhotoSelect` callback（第 191-240 行）替换为：**

```tsx
const handlePhotoSelect = useCallback(async (result: PhotoResult) => {
  try {
    await handlePhotoSelectForTest(result, {
      savePhotoToStorage: PhotoService.savePhotoToStorage.bind(PhotoService),
      addEntry,
    });
  } catch (error) {
    logger.error('[HomeScreen] Failed to save photo entry:', error);
    Alert.alert('保存失败', '照片保存失败，请重试');
  }
}, [addEntry]);
```

**3c. 从第 14 行解构中确认 `updateEntry` 是否仍在其他地方使用。** 检查文件内所有 `updateEntry` 出现的行：原有的三步写入代码已删除，`updateEntry` 在该文件中应无其他使用。从 `useEntryStore` 解构中移除：

```tsx
// 修改前
const {
  loadEntries, addEntry, updateEntry, deleteEntry,
  ...
} = useEntryStore();

// 修改后
const {
  loadEntries, addEntry, deleteEntry,
  updateRecordingStatus, updateRecordingDuration, completeRecording,
} = useEntryStore();
```

- [ ] **Step 4: 运行单元测试，确认 4/4 通过**

```bash
cd app && npx jest "app/app/\(tabs\)/__tests__/index.photo.test.ts" --no-coverage 2>&1 | tail -15
```

预期：
```
PASS app/app/(tabs)/__tests__/index.photo.test.ts
  handlePhotoSelectForTest
    ✓ savePhotoToStorage 失败时不调用 addEntry
    ✓ addEntry 收到持久化 URI，不含 content:// 前缀
    ✓ addEntry 只被调用一次（无 updateEntry 第二步）
    ✓ savePhotoToStorage 的参数不包含相机临时 URI 作为最终存储路径

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

- [ ] **Step 5: 运行完整测试套件，确认无回归**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -10
```

预期：原有所有测试通过，新增 4 个测试，总数从 71 增至 75。

- [ ] **Step 6: TypeScript 类型检查**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

预期：零错误。

- [ ] **Step 7: 提交**

```bash
git add "app/app/(tabs)/index.tsx" "app/app/(tabs)/__tests__/index.photo.test.ts"
git commit -m "fix: atomic photo write — save file before DB entry to prevent stale URIs on Android"
```

---

### 验收标准（手动测试）

在 Android 模拟器中：

1. 拍一张照片 → 卡片出现，图片显示正常
2. `pnpm run android` 重新构建安装
3. 重启后，照片卡片仍显示图片（修复前此处会消失）
4. 模拟保存失败（临时在 `savePhotoToStorage` 里 throw）→ 弹出 Alert，Timeline 不出现空卡片

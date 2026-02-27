# Missing Media Indicator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 图片丢失时禁用点击预览；音频丢失时卡片挂载即显示视觉提示。

**Architecture:** 仅修改 `EntryCard.tsx`。图片通过已有 `photoError` state 加守卫；音频新增 `audioMissing` state，`useEffect` 挂载时调用 `FileSystem.getInfoAsync` 检查，丢失时替换播放区域为提示行。

**Tech Stack:** React Native, expo-file-system, @expo/vector-icons

---

### Task 1: 图片丢失 — 禁用点击

**Files:**
- Modify: `app/src/components/EntryCard.tsx`

**Step 1: 写失败测试**

在 `app/src/components/__tests__/EntryCard.missing-media.test.tsx` 新建文件：

```typescript
/**
 * EntryCard — 媒体文件丢失行为测试
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EntryCard } from '../EntryCard';

// 最小 mock
jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({ currentPlayingId: null, setCurrentPlayingId: jest.fn() }),
}));
jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { stopPlayback: jest.fn(), playAudio: jest.fn() },
}));
jest.mock('@/src/services/photoService', () => ({
  PhotoService: { resolvePhotoUri: (uri: string) => uri },
}));
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));
jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const photoEntry = {
  id: 'p1', type: 'photo' as const,
  content: '说明', tags: [], timestamp: 1700000000000,
  syncStatus: 'synced' as const,
  media: { uri: 'file:///missing.jpg', mimeType: 'image/jpeg', size: 0 },
};

it('图片丢失时点击不应打开 ImageViewer', () => {
  const { getByTestId, queryByTestId } = render(
    <EntryCard entry={photoEntry} onDelete={jest.fn()} />
  );
  // 触发 onError 模拟图片加载失败
  fireEvent(getByTestId('photo-image'), 'error');
  // 点击卡片
  fireEvent.press(getByTestId('entry-card'));
  // ImageViewer 不应出现
  expect(queryByTestId('image-viewer')).toBeNull();
});
```

**Step 2: 运行确认失败**

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage
```

预期：FAIL（`testID` 不存在 / ImageViewer 仍然出现）

**Step 3: 最小实现**

在 `EntryCard.tsx` 中：

1. 给卡片根 `Pressable` 加 `testID="entry-card"`
2. 给 `<Image>` 加 `testID="photo-image"`
3. 给 `<ImageViewer>` 加 `testID="image-viewer"`（需在 ImageViewer 组件的根 View 上加）
4. 修改 `handleImagePress`：

```typescript
const handleImagePress = () => {
  if (photoError) return;   // 新增守卫
  setShowImageViewer(true);
};
```

5. 修改 `handleCardPress` photo 分支：

```typescript
case 'photo':
  if (photoError) return;   // 新增守卫
  setShowImageViewer(true);
  break;
```

**Step 4: 运行确认通过**

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage
```

预期：PASS

**Step 5: Commit**

```bash
git add app/src/components/__tests__/EntryCard.missing-media.test.tsx \
        app/src/components/EntryCard.tsx
git commit -m "fix: 图片丢失时禁用点击预览"
```

---

### Task 2: 音频丢失 — 挂载检查 + 视觉提示

**Files:**
- Modify: `app/src/components/EntryCard.tsx`
- Test: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`

**Step 1: 写失败测试**

在已有测试文件末尾追加：

```typescript
import * as FileSystem from 'expo-file-system';

const voiceEntry = {
  id: 'v1', type: 'voice' as const,
  content: '', tags: [], timestamp: 1700000000000,
  syncStatus: 'synced' as const,
  media: { uri: 'file:///missing.m4a', mimeType: 'audio/m4a', size: 0, duration: 3000 },
};

it('音频文件不存在时应显示"音频文件已丢失"提示', async () => {
  (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

  const { findByText } = render(
    <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
  );

  // 等待 useEffect 异步检查完成
  expect(await findByText('音频文件已丢失')).toBeTruthy();
});

it('音频丢失时点击卡片不应触发播放', async () => {
  (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });
  const { findByText, getByTestId } = render(
    <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
  );
  await findByText('音频文件已丢失');
  fireEvent.press(getByTestId('entry-card'));
  expect(VoiceService.playAudio).not.toHaveBeenCalled();
});
```

**Step 2: 运行确认失败**

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage
```

预期：FAIL（找不到"音频文件已丢失"文本）

**Step 3: 最小实现**

在 `EntryCard.tsx` 中：

1. 新增 state（紧跟 `photoError` 之后）：

```typescript
const [audioMissing, setAudioMissing] = useState(false);
```

2. 新增 useEffect（紧跟红点动画 effect 之后）：

```typescript
useEffect(() => {
  if (entry.type !== 'voice') return;
  const uri = entry.media?.uri || entry.content;
  if (!uri) return;
  FileSystem.getInfoAsync(uri)
    .then(info => { if (!info.exists) setAudioMissing(true); })
    .catch(() => {});
}, [entry.id]);
```

3. 修改 `handleCardPress` voice 分支：

```typescript
case 'voice':
  if (audioMissing) return;   // 新增守卫
  if (entry.media && !isPlayingAudio) {
    handlePlayAudio();
  }
  break;
```

4. 在 voice 卡片渲染区，`voicePlayRow` 外层加条件：

```tsx
{audioMissing ? (
  <View style={styles.audioMissingRow}>
    <Ionicons name="alert-circle-outline" size={18} color="#A3A3A3" />
    <Text style={styles.audioMissingText}>音频文件已丢失</Text>
  </View>
) : (
  <View style={styles.voicePlayRow}>
    {/* 原有播放行内容不变 */}
  </View>
)}
```

5. 在 `StyleSheet.create` 末尾追加样式：

```typescript
audioMissingRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingVertical: 8,
  paddingHorizontal: 16,
},
audioMissingText: {
  fontSize: 13,
  color: '#A3A3A3',
},
```

**Step 4: 运行确认通过**

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage
```

预期：全部 PASS

**Step 5: 运行全量测试确认无回归**

```bash
cd app && npx jest --no-coverage
```

预期：所有测试通过

**Step 6: Commit**

```bash
git add app/src/components/EntryCard.tsx \
        app/src/components/__tests__/EntryCard.missing-media.test.tsx
git commit -m "feat: 音频丢失时挂载检查并显示视觉提示"
```

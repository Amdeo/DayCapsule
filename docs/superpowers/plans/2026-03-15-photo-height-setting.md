# 照片卡片高度可配置设置项 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将照片卡片最大高度从硬编码 600dp 改为用户可在设置页选择的三档预设（200/280/400dp），默认 280dp。

**Architecture:** 仿照现有 `CardSpacing` 模式，在 `settingsStore.ts` 新增 `PhotoHeightPreset` 类型和 Zustand action，`SettingsPage.tsx` 添加可视化预设选择器组件，`EntryCard.tsx` 读取该设置替换硬编码上限并将 resizeMode 改为 cover。

**Tech Stack:** TypeScript, Zustand 5, React Native MMKV v4（`Storage` 工具封装），Jest + ts-jest

---

## Chunk 1: settingsStore 数据层

### Task 1: 扩展 settingsStore.ts

**Files:**
- Modify: `app/src/store/settingsStore.ts`

---

- [ ] **Step 1: 在 `settingsStore.ts` 顶部现有 `CardSpacing` 定义（约第 10 行）后面新增类型和值映射**

  在 `SPACING_VALUES` 块之后（约第 16 行）插入：

  ```ts
  export type PhotoHeightPreset = 'compact' | 'default' | 'large';

  export const PHOTO_HEIGHT_VALUES: Record<PhotoHeightPreset, number> = {
    compact: 200,
    default: 280,
    large:   400,
  };
  ```

- [ ] **Step 2: 在 `SETTINGS_KEYS` 对象中添加新 key**

  现有内容：
  ```ts
  const SETTINGS_KEYS = {
    notifications:     'settings:notifications',
    autoBackup:        'settings:autoBackup',
    highQualityPhotos: 'settings:highQualityPhotos',
    cardSpacing:       'settings:cardSpacing',
  };
  ```
  添加一行：
  ```ts
    photoHeight:       'settings:photoHeight',
  ```

- [ ] **Step 3: 在 `DEFAULT_SETTINGS` 中添加默认值**

  添加：
  ```ts
    photoHeight: 'default' as PhotoHeightPreset,
  ```

- [ ] **Step 4: 在 `SettingsState` interface 中新增字段和 action**

  在 `setCardSpacing` 行后添加：
  ```ts
    photoHeight: PhotoHeightPreset;
    setPhotoHeight: (value: PhotoHeightPreset) => Promise<void>;
  ```

- [ ] **Step 5: 在 `loadSettings` 中读取并验证 `photoHeight`**

  `loadSettings` 里的 `Promise.all` 数组新增一项：
  ```ts
  Storage.getString(SETTINGS_KEYS.photoHeight),
  ```
  （解构变量命名为 `ph`，与其他变量对齐）

  在 `validSpacing` 函数下方添加验证函数：
  ```ts
  const validPhotoHeight = (value: string | null): PhotoHeightPreset => {
    if (value === 'compact' || value === 'large') return value;
    return 'default';
  };
  ```

  `set({...})` 块内添加：
  ```ts
  photoHeight: ph === null ? DEFAULT_SETTINGS.photoHeight : validPhotoHeight(ph),
  ```

- [ ] **Step 6: 添加 `setPhotoHeight` action 实现**

  在 `setCardSpacing` action 之后添加：
  ```ts
  setPhotoHeight: async (value) => {
    await Storage.setString(SETTINGS_KEYS.photoHeight, value);
    set({ photoHeight: value });
  },
  ```

- [ ] **Step 7: 在 `resetSettings` 中清除 `photoHeight`**

  `Promise.all` 数组内追加：
  ```ts
  Storage.delete(SETTINGS_KEYS.photoHeight),
  ```
  `set({ ...DEFAULT_SETTINGS })` 已涵盖 `photoHeight` 重置（因为 `DEFAULT_SETTINGS` 现在包含它）。

- [ ] **Step 8: TypeScript 检查**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule/app && npx tsc --noEmit 2>&1 | head -20
  ```
  预期：无错误（除 `ExternalLink.tsx` 的预存无关警告外）。

---

### Task 2: 为 settingsStore.photoHeight 写单元测试

**Files:**
- Create: `app/src/store/__tests__/settingsStore.test.ts`

---

- [ ] **Step 1: 创建测试文件，设置 mock**

  ```ts
  /**
   * settingsStore 单元测试 — photoHeight 设置项
   */

  jest.mock('@/src/utils/storage', () => ({
    Storage: {
      getString: jest.fn(),
      setString: jest.fn(),
      delete:    jest.fn(),
    },
  }));

  jest.mock('@/src/utils/logger', () => ({
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
  }));

  import { useSettingsStore } from '../settingsStore';

  const { Storage } = require('@/src/utils/storage');

  const resetStore = () =>
    useSettingsStore.setState({
      notifications: true,
      autoBackup: false,
      highQualityPhotos: true,
      cardSpacing: 'default',
      photoHeight: 'default',
      isLoaded: false,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });
  ```

- [ ] **Step 2: 编写"key 不存在时使用默认值"测试**

  ```ts
  describe('loadSettings — photoHeight', () => {
    it('defaults to "default" when key is missing', async () => {
      Storage.getString.mockResolvedValue(null);
      await useSettingsStore.getState().loadSettings();
      expect(useSettingsStore.getState().photoHeight).toBe('default');
    });

    it('loads "compact" from storage', async () => {
      Storage.getString.mockImplementation((key: string) =>
        Promise.resolve(key === 'settings:photoHeight' ? 'compact' : null)
      );
      await useSettingsStore.getState().loadSettings();
      expect(useSettingsStore.getState().photoHeight).toBe('compact');
    });

    it('loads "large" from storage', async () => {
      Storage.getString.mockImplementation((key: string) =>
        Promise.resolve(key === 'settings:photoHeight' ? 'large' : null)
      );
      await useSettingsStore.getState().loadSettings();
      expect(useSettingsStore.getState().photoHeight).toBe('large');
    });

    it('falls back to "default" for invalid stored value', async () => {
      Storage.getString.mockImplementation((key: string) =>
        Promise.resolve(key === 'settings:photoHeight' ? 'invalid_value' : null)
      );
      await useSettingsStore.getState().loadSettings();
      expect(useSettingsStore.getState().photoHeight).toBe('default');
    });
  });
  ```

- [ ] **Step 3: 编写 `setPhotoHeight` 测试**

  ```ts
  describe('setPhotoHeight', () => {
    it('saves value to storage and updates state', async () => {
      Storage.setString.mockResolvedValue(undefined);
      await useSettingsStore.getState().setPhotoHeight('compact');
      expect(Storage.setString).toHaveBeenCalledWith('settings:photoHeight', 'compact');
      expect(useSettingsStore.getState().photoHeight).toBe('compact');
    });
  });
  ```

- [ ] **Step 4: 编写 `resetSettings` 测试**

  ```ts
  describe('resetSettings — photoHeight', () => {
    it('deletes photoHeight key and resets to default', async () => {
      Storage.delete.mockResolvedValue(undefined);
      useSettingsStore.setState({ photoHeight: 'large' });

      await useSettingsStore.getState().resetSettings();

      expect(Storage.delete).toHaveBeenCalledWith('settings:photoHeight');
      expect(useSettingsStore.getState().photoHeight).toBe('default');
    });
  });
  ```

- [ ] **Step 5: 运行测试（先确认失败）**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule/app && npx jest src/store/__tests__/settingsStore.test.ts --no-coverage 2>&1 | tail -20
  ```
  预期：测试文件加载失败或 store 中字段不存在导致 FAIL。

- [ ] **Step 6: 确认 Task 1 全部步骤完成后再次运行测试**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule/app && npx jest src/store/__tests__/settingsStore.test.ts --no-coverage 2>&1 | tail -20
  ```
  预期：所有测试 PASS。

- [ ] **Step 7: Commit**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule && git add app/src/store/settingsStore.ts app/src/store/__tests__/settingsStore.test.ts && git commit -m "feat: add photoHeight setting to settingsStore"
  ```

---

## Chunk 2: SettingsPage UI

### Task 3: 在 SettingsPage.tsx 添加 PhotoHeightSelector

**Files:**
- Modify: `app/src/components/SettingsPage.tsx`

---

- [ ] **Step 1: 更新 import 行（第 22 行）**

  原：
  ```ts
  import { useSettingsStore, CardSpacing, SPACING_VALUES } from '@/src/store/settingsStore';
  ```
  改为：
  ```ts
  import {
    useSettingsStore,
    CardSpacing, SPACING_VALUES,
    PhotoHeightPreset, PHOTO_HEIGHT_VALUES,
  } from '@/src/store/settingsStore';
  ```

- [ ] **Step 2: 在 `SPACING_LABELS` 常量（约第 34 行）下方添加高度标签映射**

  ```ts
  const PHOTO_HEIGHT_LABELS: Record<PhotoHeightPreset, string> = {
    compact: '紧凑',
    default: '默认',
    large:   '宽松',
  };
  ```

- [ ] **Step 3: 从 `useSettingsStore` 解构新字段（约第 51 行 `cardSpacing` 处）**

  在 `cardSpacing` 和 `setCardSpacing: saveCardSpacing` 之后添加：
  ```ts
  photoHeight,
  setPhotoHeight: savePhotoHeight,
  ```

- [ ] **Step 4: 添加 `handlePhotoHeight` 回调（紧跟 `handleCardSpacing` 之后，约第 132 行）**

  ```ts
  const handlePhotoHeight = useCallback(async (preset: PhotoHeightPreset) => {
    await savePhotoHeight(preset);
  }, [savePhotoHeight]);
  ```

- [ ] **Step 5: 在 JSX 中插入 `<PhotoHeightSelector>`（紧跟 `<CardSpacingSelector>` 之后，约第 310 行）**

  ```tsx
  <PhotoHeightSelector
    value={photoHeight}
    onChange={handlePhotoHeight}
  />
  ```

- [ ] **Step 6: 在文件末尾（`CardSpacingSelector` 函数之后）添加 `PhotoHeightSelector` 组件**

  ```tsx
  // 照片高度选择器组件
  function PhotoHeightSelector({
    value,
    onChange,
  }: {
    value: PhotoHeightPreset;
    onChange: (preset: PhotoHeightPreset) => void;
  }) {
    const options: PhotoHeightPreset[] = ['compact', 'default', 'large'];
    // 预览色块高度比例：紧凑=24, 默认=34, 宽松=48（视觉比例约 1:1.4:2）
    const previewHeights: Record<PhotoHeightPreset, number> = {
      compact: 24,
      default: 34,
      large:   48,
    };

    return (
      <View style={phStyles.container}>
        <View style={phStyles.header}>
          <View style={phStyles.icon}>
            <Ionicons name="image-outline" size={20} color="#77C9D4" />
          </View>
          <View style={phStyles.headerText}>
            <Text style={phStyles.title}>照片显示高度</Text>
            <Text style={phStyles.subtitle}>限制时间轴中照片卡片的最大高度</Text>
          </View>
        </View>
        <View style={phStyles.optionsRow}>
          {options.map((option) => {
            const isSelected = value === option;
            return (
              <Pressable
                key={option}
                style={[phStyles.optionCard, isSelected && phStyles.optionCardSelected]}
                onPress={() => onChange(option)}
              >
                <View style={[
                  phStyles.previewBlock,
                  { height: previewHeights[option] },
                  isSelected && phStyles.previewBlockSelected,
                ]} />
                <Text style={[phStyles.optionLabel, isSelected && phStyles.optionLabelSelected]}>
                  {PHOTO_HEIGHT_LABELS[option]}
                </Text>
                <Text style={[phStyles.optionValue, isSelected && phStyles.optionValueSelected]}>
                  {PHOTO_HEIGHT_VALUES[option]}dp
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const phStyles = StyleSheet.create({
    container: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    icon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#E8F8FA',
      borderRadius: 20,
      marginRight: 12,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: '#4A4A4A',
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: '#A3A3A3',
    },
    optionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    optionCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    optionCardSelected: {
      borderColor: '#77C9D4',
      backgroundColor: '#EEF8FA',
    },
    previewBlock: {
      width: '100%',
      borderRadius: 6,
      backgroundColor: '#D4EFF3',
    },
    previewBlockSelected: {
      backgroundColor: '#77C9D4',
    },
    optionLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: '#737373',
    },
    optionLabelSelected: {
      color: '#4A9DAA',
      fontWeight: '600',
    },
    optionValue: {
      fontSize: 11,
      color: '#B0B0B0',
    },
    optionValueSelected: {
      color: '#77C9D4',
    },
  });
  ```

- [ ] **Step 7: 更新文件末尾的 re-export（最后一行约第 641 行）**

  原：
  ```ts
  export { CardSpacing, SPACING_VALUES };
  ```
  改为：
  ```ts
  export { CardSpacing, SPACING_VALUES, PhotoHeightPreset, PHOTO_HEIGHT_VALUES };
  ```

- [ ] **Step 8: TypeScript 检查**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule/app && npx tsc --noEmit 2>&1 | head -20
  ```
  预期：无错误。

- [ ] **Step 9: Commit**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule && git add app/src/components/SettingsPage.tsx && git commit -m "feat: add PhotoHeightSelector to SettingsPage"
  ```

---

## Chunk 3: EntryCard 渲染层

### Task 4: EntryCard.tsx 读取 photoHeight 设置

**Files:**
- Modify: `app/src/components/EntryCard.tsx`

---

- [ ] **Step 1: 更新 import（约第 33 行，目前没有 settingsStore import）**

  在现有 import 末尾添加一行：
  ```ts
  import { useSettingsStore, PHOTO_HEIGHT_VALUES } from '@/src/store/settingsStore';
  ```

- [ ] **Step 2: 修改 `calculateImageHeight` 函数签名，接受 `maxHeight` 参数**

  原（第 43-47 行）：
  ```ts
  const calculateImageHeight = (aspectRatio?: number): number => {
    if (!aspectRatio || aspectRatio <= 0) return 200;
    const calculatedHeight = getCardContentWidth() / aspectRatio;
    return Math.min(calculatedHeight, 600);
  };
  ```
  改为：
  ```ts
  const calculateImageHeight = (aspectRatio: number | undefined, maxHeight: number): number => {
    if (!aspectRatio || aspectRatio <= 0) return Math.min(200, maxHeight);
    const calculatedHeight = getCardContentWidth() / aspectRatio;
    return Math.min(calculatedHeight, maxHeight);
  };
  ```

- [ ] **Step 3: 在 `EntryCard` 函数体内（`const { currentPlayingId, ...` 之后）读取设置**

  ```ts
  const photoHeight = useSettingsStore((s) => s.photoHeight);
  const maxPhotoHeight = PHOTO_HEIGHT_VALUES[photoHeight];
  ```

- [ ] **Step 4: 更新 `calculateImageHeight` 调用处（约第 342 行）**

  原：
  ```tsx
  { height: calculateImageHeight(entry.media?.metadata?.aspectRatio) }
  ```
  改为：
  ```tsx
  { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight) }
  ```

- [ ] **Step 5: 将 `resizeMode` 从 `"contain"` 改为 `"cover"`（约第 344 行）**

  原：
  ```tsx
  resizeMode="contain"
  ```
  改为：
  ```tsx
  resizeMode="cover"
  ```

- [ ] **Step 6: 移除 `photoImage` 样式中的 `minHeight: 200`（约第 585-589 行）**

  原：
  ```ts
  photoImage: {
    width: '100%',
    minHeight: 200,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  ```
  改为（删除 `minHeight` 行）：
  ```ts
  photoImage: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  ```

- [ ] **Step 7: TypeScript 检查**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule/app && npx tsc --noEmit 2>&1 | head -20
  ```
  预期：无错误。

- [ ] **Step 8: 运行所有测试**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule/app && npx jest --no-coverage 2>&1 | tail -20
  ```
  预期：所有已有测试 PASS，settingsStore 新测试 PASS。

- [ ] **Step 9: Commit**

  ```bash
  cd /Users/cooper/Documents/code/MemoryCapsule && git add app/src/components/EntryCard.tsx && git commit -m "feat: use photoHeight setting in EntryCard, switch to cover resizeMode"
  ```

---

## 验收标准

1. 设置页「照片显示高度」三档卡片可正常切换，选中态高亮正确
2. 切换档位后立即刷新 Timeline 中照片卡片高度（Zustand 响应式）
3. 杀死 App 重启后设置仍然保持（MMKV 持久化）
4. 「重置设置」后照片高度回到 `default`（280dp）
5. TypeScript 零错误，所有 Jest 测试通过

# FABMenu UX Tweaks 设计文档

**日期：** 2026-03-15
**状态：** 已批准

---

## 目标

对 FABMenu 做两处小幅 UX 改善：
1. 扇形展开时隐藏"长按选择记录类型"提示气泡
2. 花瓣按钮离主 FAB 更远、尺寸稍大

---

## 修改范围

**仅修改一个文件：** `app/src/components/FABMenu.tsx`

---

## 变更详情

### 1. 提示气泡隐藏逻辑

**现状：** `tipBubble` 的显示条件为 `lastAddType === null`，扇形展开后气泡不隐藏，与花瓣按钮同时出现，干扰交互。

**修改：** 将条件改为 `lastAddType === null && !isExpanded`。

```tsx
// Before
{lastAddType === null && (
  <View style={styles.tipBubble}>...</View>
)}

// After
{lastAddType === null && !isExpanded && (
  <View style={styles.tipBubble}>...</View>
)}
```

**行为说明：**

| 状态 | 气泡显示 |
|------|---------|
| 首次启动，扇形未打开 | ✅ 显示 |
| 扇形展开中 (`isExpanded === true`) | ❌ 隐藏 |
| 用户选择过一次后 (`lastAddType !== null`) | ❌ 永久消失 |

`isExpanded` 已是现有 React state（在 `openFan` 中 `setIsExpanded(true)`，在 `closeFan` 中 `setIsExpanded(false)`），无需新增状态。

---

### 2. 花瓣按钮尺寸与距离

**现状：**
- `OPTION_SIZE = 48`
- `dist: 80`（文字/语音）、`dist: 85`（相册/拍照）

**修改：**
- `OPTION_SIZE = 56`（增大 8px，与主 FAB 等宽，视觉更平衡）
- 所有选项 `dist` 统一改为 `120`（增加约 40%，与主按钮间距更舒适）

```ts
// Before
const OPTION_SIZE = 48;
const FAN_OPTIONS = [
  { ..., angle: -60, dist: 80 },
  { ..., angle: -20, dist: 85 },
  { ..., angle:  20, dist: 85 },
  { ..., angle:  60, dist: 80 },
];

// After
const OPTION_SIZE = 56;
const FAN_OPTIONS = [
  { ..., angle: -60, dist: 120 },
  { ..., angle: -20, dist: 120 },
  { ..., angle:  20, dist: 120 },
  { ..., angle:  60, dist: 120 },
];
```

**关联常量自动更新：**
- `OPTION_ICON_HALF = OPTION_SIZE / 2`（依赖 `OPTION_SIZE`，自动变为 28）
- `hitTest` 角度边界（`-40, 0, 40`）与距离无关，无需修改

**图标尺寸：** `FanOptionButton` 中 `<Ionicons size={22} />` 可同步增大到 `24`，与按钮尺寸更协调。

---

## 验收标准

1. 首次启动（`lastAddType === null`），未长按时气泡可见
2. 长按 300ms 扇形展开时，气泡消失，不与花瓣按钮重叠
3. 扇形关闭后，若仍是首次（`lastAddType === null`），气泡重新出现
4. 花瓣按钮比之前明显更远离主 FAB（约 120dp 处）
5. 花瓣按钮尺寸比之前稍大（56px）
6. 命中检测正常工作，拖动到各选项能正确高亮和触发

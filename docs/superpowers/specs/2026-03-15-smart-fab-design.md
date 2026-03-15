# 智能记忆 FAB — 设计文档

**日期：** 2026-03-15
**状态：** 已确认

## 背景

当前 FAB 采用两级菜单（加号 → 文字/照片/语音 → 拍照/相册），操作路径长，用户体验繁琐。改为「单击触发上次操作 + 长按扇形选择」模式，大幅减少高频场景的点击次数。

## 目标

- 记住用户上次使用的添加类型，单击直接触发
- 长按 + 拖动扇形菜单作为切换方式，替代所有二级菜单
- 首次使用时通过气泡提示引导用户发现长按手势

## 架构

### 数据层 — `app/src/store/settingsStore.ts`

新增 MMKV key：
```ts
lastAddType: 'settings:lastAddType',
```

新增类型和状态字段：
```ts
export type LastAddType = 'text' | 'camera' | 'photo' | 'voice';

// SettingsState 新增：
lastAddType: LastAddType | null;
setLastAddType: (value: LastAddType) => Promise<void>;
```

- 初始值：`null`（从未选择过）
- `DEFAULT_SETTINGS` 中同步增加 `lastAddType: null`
- `loadSettings` 中读取并验证（合法值之外回退 `null`）
- `resetSettings` 中删除 key 并通过 `set({ ...DEFAULT_SETTINGS })` 重置为 `null`

### 交互层 — `app/src/components/FABMenu.tsx`

完整重写 FABMenu 的交互逻辑。

#### `FABMenuProps` 接口

`onSelect` 签名**保持不变**：

```ts
onSelect: (type: 'text' | 'photo' | 'voice', photoResult?: PhotoResult) => void;
fabOpacity?: RNAnimated.Value;
fabScale?: RNAnimated.Value;
```

`PhotoService`（拍照/相册）调用继续在 **FABMenu 内部**完成，调用方不感知 `'camera'` 与 `'photo'` 的区别——`'camera'` 类型仅用于 `LastAddType` 的内部存储，触发后仍通过 `onSelect('photo', photoResult)` 回调给父组件。

#### FAB 外观状态

| 条件 | 图标 | 颜色 | 附加元素 |
|------|------|------|---------|
| `lastAddType === null` | 加号（`add`） | `#6A89CC`（原色） | 上方气泡「长按选择记录类型」 |
| `lastAddType !== null` | 对应操作图标 | 对应操作颜色 | 下方小标签显示操作名称 |

气泡显示条件：`lastAddType === null`。首次长按成功选择后，`lastAddType` 写入非 null 值，气泡自动消失，**无需额外 MMKV key**。

各类型图标与颜色：

| 类型 | 图标 | 颜色 |
|------|------|------|
| `text` | `create-outline` | `#A491D3` |
| `camera` | `camera` | `#77C9D4` |
| `photo` | `images` | `#57B8C8` |
| `voice` | `mic-outline` | `#F5A623` |

#### 手势行为

| 手势 | 条件 | 结果 |
|------|------|------|
| 单击 | `lastAddType === null` | 无响应 |
| 单击 | `lastAddType !== null` | 直接触发上次操作 |
| 长按（≥ 300ms） | 任意 | 触觉反馈 + 扇形展开 |
| 长按后拖动到选项松手 | 扇形展开中 | 触发该操作，保存新记忆，关闭扇形 |
| 长按后松手回原位 | 扇形展开中 | 取消，不触发，关闭扇形 |

#### 扇形选项布局（4 个，替代原有 3+2 结构）

角度定义：以 FAB 正上方为 0°，顺时针为正，逆时针为负（与现有坐标系一致：`x += sin(angle) * dist`，`y -= cos(angle) * dist`）。

| 选项 | 角度 | 展开距离 |
|------|------|---------|
| 文字 | -60° | 80dp |
| 相册 | -20° | 85dp |
| 拍照 | +20° | 85dp |
| 语音 | +60° | 80dp |

最大水平偏移：`sin(60°) × 80 ≈ 69dp`，FAB 居中时两侧各有约 (屏幕宽/2 − 69)dp 余量，不会溢出屏幕边缘。

长按展开时显示背景遮罩（同现有实现）。拖动到某个选项上时该选项高亮放大（`scale: 1.2`）表示悬停。

#### 实现方式

使用 **`PanResponder`**（React Native 内置，无需新依赖）统一处理长按判断和拖动轨迹。现有代码无 `react-native-gesture-handler` 使用，避免引入新依赖。扇形展开动画继续使用现有的 `react-native-reanimated`（`useSharedValue` / `useAnimatedStyle`），与 `PanResponder` 配合时通过共享值驱动。

- 长按阈值：300ms
- 触觉反馈：`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`
- Android 硬件返回键监听器：**移除**（长按扇形为瞬态，松手自动关闭，无需拦截 Back 键）

**命中检测策略（拖动悬停判断）**：使用**角度区间**判断当前手指悬停在哪个选项上。以 FAB 中心为原点，计算手指位移向量的方向角，按如下区间分配：

| 区间 | 命中选项 |
|------|---------|
| < -40° | 文字 |
| -40° ~ 0° | 相册 |
| 0° ~ +40° | 拍照 |
| > +40° | 语音 |
| 距离 < 30dp（接近中心） | 无命中（取消区） |

拖动时将当前命中选项 index 写入共享值，对应选项的 Reanimated 动画响应 `scale: 1.2` 高亮。

**单击触发 `camera` 的执行流**：当 `lastAddType === 'camera'` 时单击，与长按选择 camera 后松手的路径完全等价，即直接调用 `PhotoService.takePhoto()`（含权限请求），成功后通过 `onSelect('photo', photoResult)` 回调父组件。

## 受影响文件

| 文件 | 改动类型 |
|------|---------|
| `app/src/store/settingsStore.ts` | 新增 `LastAddType` 类型、`lastAddType` 状态字段（含 `DEFAULT_SETTINGS`）、`setLastAddType` action、MMKV key |
| `app/src/components/FABMenu.tsx` | 重写交互逻辑（PanResponder 长按/拖动）、FAB 外观随记忆变化，移除二级菜单和 Back 键监听 |

## 不在范围内

- 气泡提示的「不再显示」开关（气泡随 `lastAddType` 自动消失）
- 无障碍模式下的长按替代交互
- 多选/批量添加
- 拖动选择后的撤销功能

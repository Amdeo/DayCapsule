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
- `loadSettings` 中读取并验证（合法值之外回退 `null`）
- `resetSettings` 中删除 key 并重置为 `null`

### 交互层 — `app/src/components/FABMenu.tsx`

完整重写 FABMenu 的交互逻辑。

#### FAB 外观状态

| 条件 | 图标 | 颜色 | 附加元素 |
|------|------|------|---------|
| `lastAddType === null` | 加号（`add`） | `#6A89CC`（原色） | 上方气泡「长按选择记录类型」 |
| `lastAddType !== null` | 对应操作图标 | 对应操作颜色 | 下方小标签显示操作名称 |

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
| 长按后拖动到选项松手 | 扇形展开中 | 触发该操作并保存为新记忆 |
| 长按后松手回原位 | 扇形展开中 | 取消，不触发任何操作 |

#### 扇形选项布局（4 个，替代原有 3+2 结构）

| 选项 | 角度 | 展开距离 |
|------|------|---------|
| 文字 | -60° | 80dp |
| 相册 | -20° | 85dp |
| 拍照 | +20° | 85dp |
| 语音 | +60° | 80dp |

长按展开时显示背景遮罩（同现有实现），拖动到某个选项时该选项高亮放大（scale 1.2）表示悬停。

#### 实现方式

使用 `PanResponder`（或 Reanimated `useGestureHandler`）代替当前的 `TouchableOpacity onPress`，统一处理长按判断和拖动轨迹。长按阈值 300ms，用 `Haptics.impactAsync` 触发触觉反馈。

## 受影响文件

| 文件 | 改动类型 |
|------|---------|
| `app/src/store/settingsStore.ts` | 新增 `LastAddType` 类型、`lastAddType` 状态字段、`setLastAddType` action、MMKV key |
| `app/src/components/FABMenu.tsx` | 重写交互逻辑（单击/长按/拖动/扇形展开）和 FAB 外观 |

## 不在范围内

- 气泡提示的「不再显示」开关
- 无障碍模式下的长按替代交互
- 多选/批量添加
- 拖动选择后的撤销功能

# EntryCard 滑动操作设计文档

**日期**: 2026-03-16
**功能**: 卡片向左滑动显示编辑/删除操作按钮

---

## 背景

当前 EntryCard 通过长按弹出 ActionSheet 显示操作选项（编辑、删除）。为了提供更直观的 iOS 风格交互体验，添加向左滑动显示操作按钮的功能。

---

## 设计决策

### 交互风格

选择 **iOS 邮件风格**：
- 向左滑动平滑露出两个等宽按钮
- 编辑按钮（灰色背景）+ 删除按钮（红色背景）
- 按钮宽度约 80-90px，并排显示

### 滑动行为

| 属性 | 决策 | 说明 |
|------|------|------|
| 滑动方向 | 仅左滑 | 右滑不处理 |
| 展开方式 | 弹性回弹 | 滑动后松手自动回弹，露出可点击区域 |
| 快速滑动 | 支持 | flick 手势可直接展开按钮 |
| 收起方式 | 点击外部 | 点击其他区域或滑动其他卡片时自动收起 |

### 动画风格

**弹簧动画**（iOS 风格）：
- 使用 `Swipeable` 内置的弹簧动画（通过 `friction` 参数控制）
- 无需手动配置 Animated.spring 参数

**具体参数**:
- `friction={2}`: 摩擦力，值越小弹性越强（iOS 风格推荐 1-3）
- 动画时长由 Gesture Handler 内部控制，约 300-400ms
- 效果：滑动时有轻微的超出和回弹，模拟 iOS 原生手感

---

## 视觉规范

### 按钮样式

编辑按钮:
- 背景色: #8E8E93 (iOS 系统灰)
- 文字: "编辑"
- 文字颜色: 白色
- 字体大小: 14px
- 字重: 500

删除按钮:
- 背景色: #FF3B30 (iOS 系统红)
- 文字: "删除"
- 文字颜色: 白色
- 字体大小: 14px
- 字重: 500

### 按钮布局

```
┌─────────────────────────────────────┬──────────┬──────────┐
│                                     │   编辑    │   删除    │
│          卡片内容区域                │  (灰色)  │  (红色)  │
│                                     │          │          │
└─────────────────────────────────────┴──────────┴──────────┘
         ↑ 向左滑动                  80-90px    80-90px
```

---

## 技术实现

### 依赖库

**状态**: ✅ 已安装

- `react-native-gesture-handler`: ^2.30.0

项目已包含所需依赖，无需额外安装。`react-native-gesture-handler` 的 Swipeable 组件可直接使用。

### EntryCard 组件接口变更

#### 新增 Props

```typescript
interface EntryCardProps {
  // 现有 props...

  /** 当前卡片是否处于展开状态（由父组件控制多卡片收起） */
  isSwipeOpen?: boolean;

  /** 当用户开始滑动当前卡片时触发 */
  onSwipeStart?: (entryId: string) => void;

  /** 当用户关闭滑动或滑动其他卡片时触发 */
  onSwipeClose?: () => void;
}
```

**所有新增 props 均为可选**，保持向后兼容。当 Timeline 使用这些 props 时，实现多卡片收起功能。

### 组件改造

**文件**: `src/components/EntryCard.tsx`

#### 1. 导入依赖

```typescript
import { Swipeable } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
```

#### 2. 创建右滑操作区域

```typescript
const renderRightActions = (
  progress: Animated.AnimatedInterpolation<number>,
  dragX: Animated.AnimatedInterpolation<number>
) => {
  const trans = dragX.interpolate({
    inputRange: [-170, 0],
    outputRange: [0, 170],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ transform: [{ translateX: trans }] }}>
      <View className="flex-row items-center">
        <TouchableOpacity
          className="bg-[#8E8E93] w-[85px] h-full justify-center items-center"
          onPress={handleEdit}
          accessibilityLabel="编辑条目"
        >
          <Text className="text-white text-sm font-medium">编辑</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-[#FF3B30] w-[85px] h-full justify-center items-center"
          onPress={handleDelete}
          accessibilityLabel="删除条目"
        >
          <Text className="text-white text-sm font-medium">删除</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};
```

#### 3. 修改卡片容器

```typescript
<Swipeable
  ref={swipeableRef}
  renderRightActions={renderRightActions}
  friction={2}              // 摩擦力，控制弹簧感
  leftThreshold={40}        // 触发阈值
  rightThreshold={40}
  overshootRight={false}    // 禁用右侧过度滑动
  dragOffsetFromRightEdge={10}
  onSwipeableWillOpen={() => {
    onSwipeStart?.(entry.id);
  }}
  onSwipeableWillClose={() => {
    onSwipeClose?.();
  }}
>
  {/* 原有卡片内容 */}
</Swipeable>
```

#### 4. 动画库选择

**决策**: 使用 `react-native` 内置的 `Animated` API。

**理由**:
- `Swipeable` 的 `renderRightActions` 回调参数（`progress`, `dragX`）是 `Animated.AnimatedInterpolation` 类型
- 与内置 `Animated` API 配合无需额外转换

#### 5. 手势冲突处理

**机制**: `Swipeable` 内部使用 `PanGestureHandler`，与 Timeline 的 `FlatList` 滚动通过 Gesture Handler 的原生协调机制自动处理：
- 当检测到明显的垂直滚动（手指移动角度接近 90°）时，自动让出给列表滚动
- 当检测到明显的水平滑动（手指移动角度接近 0°）时，激活滑动操作

**Timeline 配置要求**:
**检查点**: 确认 Timeline 当前使用的 FlatList 来源。如果使用的是 `react-native` 的 FlatList，需要切换为 `react-native-gesture-handler` 版本：
```typescript
import { FlatList } from 'react-native-gesture-handler';

// 在 Timeline 中使用
<FlatList
  ...
  renderItem={({ item }) => (
    <EntryCard
      entry={item}
      isSwipeOpen={openSwipeId === item.id}
      onSwipeStart={handleSwipeStart}
      onSwipeClose={handleSwipeClose}
    />
  )}
/>
```

**阈值配置**:
- `dragOffsetFromRightEdge={10}`: 从右边缘 10px 开始识别滑动（初始值）
- `leftThreshold={40}`: 滑动超过 40px 视为有意操作

**调优策略**:
```typescript
// 调试配置 - 观察触发频率
onSwipeableWillOpen={() => {
  console.log('[Swipe] Card opened:', entry.id);
  onSwipeStart?.(entry.id);
}}
```
- 如果用户报告误触发：增大 `dragOffsetFromRightEdge` 到 15-20px
- 如果滑动难以触发：减小 `dragOffsetFromRightEdge` 到 5px

#### 6. 长按行为调整

**变更前**: 长按弹出 ActionSheet（编辑/删除/取消）

**变更后**: 长按仅触发卡片展开（查看详情/全文）

```typescript
const handleLongPress = () => {
  // 触发卡片展开，不弹出 ActionSheet
  setIsExpanded(true);
};
```

**用户体验说明**:

展开后当前不提供编辑/删除入口（详情页无操作按钮）。本阶段在展开状态的底部添加"完成"按钮，点击后收起卡片，然后用户可以滑动操作。详情页操作按钮在后续迭代中添加。

### 状态管理

#### Swipeable 引用管理

```typescript
const swipeableRef = useRef<Swipeable>(null);

const handleEdit = () => {
  swipeableRef.current?.close();
  onEdit?.();
};

const handleDelete = () => {
  swipeableRef.current?.close();
  onDelete?.();
};
```

#### 多卡片收起机制

**实现方案**: 父组件 Timeline 统一管理当前展开的卡片 ID

```typescript
// Timeline.v2.tsx
const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

// 传递给 EntryCard
<EntryCard
  entry={entry}
  isSwipeOpen={openSwipeId === entry.id}
  onSwipeStart={(id) => setOpenSwipeId(id)}
  onSwipeClose={() => setOpenSwipeId(null)}
/>
```

```typescript
// EntryCard.tsx - 监听 isSwipeOpen 变化
useEffect(() => {
  if (!isSwipeOpen && swipeableRef.current) {
    swipeableRef.current.close();
  }
}, [isSwipeOpen]);
```

**性能优化**:

EntryCard 已使用 `React.memo` 包裹（MemoizedEntryCard），当 `isSwipeOpen` 变化时：
- 仅当前展开的卡片和之前展开的卡片会重新渲染
- 其他卡片通过 `React.memo` 跳过渲染

Timeline 中的回调使用 `useCallback` 缓存：
```typescript
const handleSwipeStart = useCallback((id: string) => {
  setOpenSwipeId(id);
}, []);

const handleSwipeClose = useCallback(() => {
  setOpenSwipeId(null);
}, []);
```

**优势**:
- 简单直接，无需 Context 或全局状态
- 性能友好，只重新渲染受影响的卡片
- 符合 React 数据流

---

## 测试策略

### 单元测试方案

由于 `Swipeable` 组件涉及原生手势和动画，单元测试需要特殊处理：

#### Mock 配置

```typescript
// __mocks__/react-native-gesture-handler.ts
export const Swipeable = jest.fn(({ children, renderRightActions }) => {
  // 模拟 Swipeable 组件，直接渲染内容和右操作区域
  return (
    <>
      {children}
      {renderRightActions?.(
        { interpolate: () => 0 } as any,
        { interpolate: () => 0 } as any
      )}
    </>
  );
});
Swipeable.prototype = { close: jest.fn() };

export * from 'react-native-gesture-handler';
```

#### 测试用例

```typescript
describe('EntryCard swipe actions', () => {
  it('renders edit and delete buttons', () => {
    const { getByLabelText } = render(<EntryCard entry={mockEntry} />);
    expect(getByLabelText('编辑条目')).toBeTruthy();
    expect(getByLabelText('删除条目')).toBeTruthy();
  });

  it('calls onEdit when edit button pressed', () => {
    const onEdit = jest.fn();
    const { getByLabelText } = render(
      <EntryCard entry={mockEntry} onEdit={onEdit} />
    );
    fireEvent.press(getByLabelText('编辑条目'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('closes swipe when isSwipeOpen changes to false', () => {
    const closeMock = jest.fn();
    jest.spyOn(Swipeable.prototype, 'close').mockImplementation(closeMock);

    const { rerender } = render(
      <EntryCard entry={mockEntry} isSwipeOpen={true} />
    );
    rerender(<EntryCard entry={mockEntry} isSwipeOpen={false} />);

    expect(closeMock).toHaveBeenCalled();
  });

  it('expands card on long press instead of showing action sheet', () => {
    const { getByTestId, queryByText } = render(<EntryCard entry={mockEntry} />);
    fireEvent(getByTestId('entry-card'), 'onLongPress');
    // 验证没有弹出 ActionSheet
    expect(queryByText('编辑')).toBeNull();
    // 验证卡片展开
    expect(getByTestId('expanded-content')).toBeTruthy();
  });
});
```

**测试文件路径**:
- `src/components/__tests__/EntryCard.test.tsx` - 主测试文件
- `src/components/__tests__/EntryCard.missing-media.test.tsx` - 媒体缺失场景测试

**覆盖率要求**: 核心逻辑（回调触发、状态管理）覆盖率不降低，UI 动画部分可适当降低要求。

### 手动测试清单

- 滑动流畅度
- 手势冲突处理（斜向滑动测试）
- 多设备兼容性

---

## 测试要点

### 功能测试

- [ ] 向左滑动显示编辑和删除按钮
- [ ] 按钮点击触发对应操作
- [ ] 点击卡片其他区域收起按钮
- [ ] 滑动其他卡片时当前卡片自动收起
- [ ] 快速滑动（flick）可展开按钮
- [ ] 右滑不触发任何操作

### 交互测试

- [ ] 弹簧动画流畅自然
- [ ] 按钮区域足够大，易于点击
- [ ] 滑动与滚动的手势不冲突（重点测试斜向滑动）
- [ ] 长按正确触发卡片展开

### 边界测试

- [ ] 列表顶部/底部卡片滑动正常
- [ ] 大量卡片时性能表现（测试 200 条以上数据，目标帧率 60fps）
- [ ] 快速连续滑动多个卡片

### 性能测试基准

**测试环境**: 中端设备（iPhone 12 或同等级 Android）

**测量方法**:
- 使用 Xcode Instruments (iOS) 或 Android Profiler 测量帧率
- 或手动观察：滑动过程中是否出现卡顿/掉帧

**验收标准**:
- 滑动过程中帧率 ≥ 55fps
- 无明显的掉帧或卡顿

**Fallback 方案**:
- 如果达不到 60fps，考虑减少动画复杂度（如使用线性动画代替弹簧动画）

---

## 删除确认机制

**保持不变**: 点击删除按钮后，弹出确认对话框（Alert），用户确认后才执行删除。

**原因**:
- 防止误触删除
- 删除是不可逆操作，需要二次确认
- 与现有行为一致，降低用户学习成本

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 手势与滚动冲突 | 中 | 高 | 调整滑动阈值，测试滚动流畅度 |
| 动画性能问题 | 低 | 中 | 使用原生动画，避免 JS 线程阻塞 |
| 误触操作 | 中 | 中 | 足够大的按钮区域，弹性回弹设计 |
| **用户习惯变更** | **中** | **中** | **滑动符合 iOS 习惯，学习成本低；如需可添加设置项恢复长按菜单** |

### 用户习惯变更说明

**变更点**: 长按从"弹出操作菜单"变为"展开卡片"

**影响**: 现有用户可能需要时间适应新的操作方式

**缓解策略**:
1. 滑动操作更直观，符合 iOS 用户习惯
2. 如需过渡引导，可在首次使用时显示提示（不在本阶段实现）

---

## 无障碍考虑

### 设计原则

滑动操作对屏幕阅读器用户不够直观。当前的替代方案：

1. **滑动按钮的无障碍支持** - 屏幕阅读器可以聚焦并读出编辑/删除按钮
2. **长按展开卡片** - 作为查看详情的替代入口

**已知限制**: 当前详情页（展开后的卡片）不包含编辑/删除按钮，屏幕阅读器用户需要通过滑动操作完成编辑/删除。本阶段仅确保滑动按钮的无障碍标签正确。

### 基础无障碍支持

- 编辑按钮: `accessibilityLabel="编辑条目"`
- 删除按钮: `accessibilityLabel="删除条目"`
- 滑动区域: `accessibilityHint="向左滑动显示编辑和删除选项"`

---

## 验收标准

1. 所有卡片支持向左滑动显示操作按钮
2. 编辑/删除按钮样式符合设计规范
3. 弹簧动画流畅，帧率 ≥ 55fps
4. 长按仅触发卡片展开，不再弹出 ActionSheet
5. 通过所有功能测试和交互测试
6. 无 TypeScript 类型错误
7. 单元测试覆盖率不降低
8. 已知无障碍限制：屏幕阅读器用户需通过滑动操作完成编辑/删除，详情页操作按钮在后续迭代中添加

---

## 相关文件

- `src/components/EntryCard.tsx` - 主要修改文件
  - 添加 Swipeable 包裹
  - 实现 renderRightActions
  - 移除长按 ActionSheet
  - 新增 onSwipeStart/onSwipeClose/isSwipeOpen props

- `src/components/Timeline.v2.tsx` - 适配多卡片收起
  - 新增 openSwipeId 状态
  - 传递给 EntryCard 控制滑动状态

- `src/components/__tests__/EntryCard.test.tsx` - 测试文件更新
  - 更新长按行为测试
  - 添加滑动交互测试

# EntryCard 边框与阴影设计

**日期**: 2026-03-17
**状态**: 已批准

## 问题

Timeline 列表中，卡片（`EntryCard`）浮于 `#FAF8F5` 暖米白背景之上，当前仅靠极弱阴影（`shadowOpacity: 0.08`）与背景分层，没有边框。白色卡片与暖米背景对比不足，卡片边界模糊，视觉层次感弱。

## 设计决策

选择方案：**细边框 + 柔和阴影**（暖米色边框）

### 变更范围

仅修改 `app/src/components/EntryCard.tsx` 中的 `styles.cardShadow`，其余样式不变。

### 具体数值

| 属性 | 当前值 | 新值 |
|------|--------|------|
| `borderWidth` | 无 | `1` |
| `borderColor` | 无 | `rgba(139, 115, 85, 0.15)` |
| `shadowOpacity` | `0.08` | `0.07` |
| `shadowOffset` | `{ width: 0, height: 2 }` | `{ width: 0, height: 2 }` |
| `shadowRadius` | `6` | `8` |
| `elevation` | `3` | `3` |

### 设计理由

- **暖米色边框**（而非中性灰）：与应用整体暖色调一致（背景 `#FAF8F5`、语音卡 `#FFF8EE`、时间线圆点偏暖），避免中性灰在暖背景上显得"凉"
- **保留阴影**：阴影提供轻微 Z 轴高度感，配合边框形成双重层次
- **阴影稍扩散**（radius 6→8）：扩散半径略大，过渡更自然，但不抢眼
- **变更最小化**：只改 `cardShadow` 一处，不影响任何其他卡片内部元素

## 实现说明

```ts
// app/src/components/EntryCard.tsx
cardShadow: {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(139, 115, 85, 0.15)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
},
```

## 测试要求

- 目视确认：文字、照片、语音三种卡片在 Timeline 中边界清晰
- 不影响现有单元测试（纯样式改动，无逻辑变更）

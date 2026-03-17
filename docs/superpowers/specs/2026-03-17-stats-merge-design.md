# 统计功能合并设计

**日期**: 2026-03-17
**状态**: 已批准

## 背景

应用中存在两处统计入口，内容高度重叠：

- **StatsView**（`app/src/components/StatsView.tsx`）：Timeline 主页第4个视图 Tab，展示总数大卡、类型分布+百分比、近6个月柱状趋势图、常用标签（最多8个）
- **StatsPage**（`app/src/components/StatsPage.tsx`）：侧边菜单 → "统计"，展示4格类型卡片、时间维度（本周/本月/最活跃天/语音总时长）、热门标签（最多5个）

两个组件均独立遍历 `entries` 做统计计算，存在重复逻辑。

## 目标

- 消除重复，合并为单一统计入口
- 主页 Timeline Tab 从4个缩减到3个，导航更聚焦
- 新统计页内容完整，一次呈现所有维度

## 方案：合并为单一 StatsPage（菜单入口）

### 架构变更

**删除文件：**
- `app/src/components/StatsView.tsx`

**修改文件：**
- `app/src/components/StatsPage.tsx` — 重写，合并两者全部内容
- `app/src/components/Timeline.v2.tsx` — 删除 `stats` ViewMode 及相关 Tab 按钮和渲染分支

**不变：**
- `Sidebar.tsx` 中菜单入口"统计"保持不变
- `DetailPageShell` 弹出层框架保持不变

### 新 StatsPage 内容结构

| 顺序 | 区块 | 内容 | 来源 |
|------|------|------|------|
| 1 | **总览** | 4格卡片：文字记录数 / 照片记录数 / 语音记录数 / 全部记录数 | StatsPage |
| 2 | **时间维度** | 本周新增 / 本月新增 / 最活跃的一天 / 语音总时长 | StatsPage |
| 3 | **近6个月趋势** | 柱状图，6列，每列对应一个月的记录数 | StatsView |
| 4 | **常用标签** | 最多8个标签（原 StatsPage 取5个，统一提升到8个） | 两者取最大值 |

### 数据计算

将 `StatsView` 和 `StatsPage` 中的两个 `useMemo` 合并为一个，在新 `StatsPage` 内一次性计算所有指标，避免重复遍历 `entries`：

- `total`、`text`、`photo`、`voice` 计数
- `thisWeek`、`thisMonth` 计数
- `busiestDay` 字符串
- `totalVoiceDuration` 秒数
- `months[6]`：近6个月每月计数 + 最大值（用于柱状图比例）
- `topTags[8]`：标签频率 Top 8

### Timeline.v2.tsx 变更

1. 删除 `ViewMode` 联合类型中的 `'stats'`
2. 删除 `{ mode: 'stats', icon: 'bar-chart', label: '统计' }` Tab 配置项
3. 删除 `import { StatsView }` 语句
4. 删除 `viewMode === 'stats'` 渲染分支

Tab 从4个变3个后，Tab 栏间距自适应，无需额外样式调整。

## 影响范围

```
删除  app/src/components/StatsView.tsx
修改  app/src/components/StatsPage.tsx
修改  app/src/components/Timeline.v2.tsx
```

共涉及3个文件，无新增文件，无接口变更，无状态层改动。

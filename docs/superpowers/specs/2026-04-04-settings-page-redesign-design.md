# 设置页面重新设计

## 背景

当前设置页面存在三个核心问题：
1. **信息层级混乱** — 8 个 section 平铺，每个独立灰色卡片视觉权重相同，找不到重点
2. **不常用功能占据过多空间** — 后端服务器配置（URL 输入框 + 测试/保存按钮 + 历史记录 chips）占了大量首屏空间
3. **视觉风格不统一** — 独立灰色卡片之间的间距和背景色缺乏层次感

## 设计方案：用户档案卡 + 功能分组

### 整体结构

保持**单页 ScrollView 布局**，将 8 个 section 重组为 4+1 个：

```
┌─────────────────────────────┐
│  📱 用户档案卡（新）          │  ← 替代 SettingsOverviewCard
├─────────────────────────────┤
│  § 账户与云同步               │  ← 简化，去掉后端配置
│    云端模式 [Switch]          │
│    ─────────────────         │
│    同步状态 [>]               │
│    ─────────────────         │
│    退出登录 [>]（danger）     │
├─────────────────────────────┤
│  § 外观                      │  ← 合并"提醒"+"内容显示"
│    推送通知 [Switch]          │
│    ─────────────────         │
│    卡片间距 [segment]         │
│    ─────────────────         │
│    日历密度 [segment]         │
│    ─────────────────         │
│    照片显示高度 [cards]        │
├─────────────────────────────┤
│  § 数据管理                   │  ← 合并"数据与存储"+"标签"+"危险操作"
│    高质量照片 [Switch]        │
│    ─────────────────         │
│    预制标签管理 [>]           │
│    ─────────────────         │
│    清除缓存 [>]              │
│    ─────────────────         │
│    重置设置（danger）         │
├─────────────────────────────┤
│  § 关于与支持                 │  ← 原"支持" section
│    帮助与反馈 [>]             │
│    ─────────────────         │
│    关于 [>]                  │
├─────────────────────────────┤
│  § 高级（可折叠，默认收起）    │  ← 后端服务器配置
│    后端服务器 [折叠/展开]      │
│      URL 输入框               │
│      测试连接 | 保存并切换     │
│      最近使用                 │
└─────────────────────────────┘
```

### 1. 用户档案卡（替代 SettingsOverviewCard）

**位置：** 页面最顶部

**布局：**
- 渐变背景（`#F0F7FF` → `#EEF8FA`），圆角 16px
- 上半部：头像（邮箱首字母，渐变色圆形） + 邮箱 + 同步状态指示灯
  - 绿色圆点 = 已同步
  - 黄色圆点 = 同步中
  - 灰色圆点 = 本地模式
- 下半部：三列统计卡（记录数 / 照片数 / 存储大小），半透明白色背景
- 未登录状态：显示占位图标 + "未登录" + 登录按钮

**删除的信息：** 服务器地址（移至"高级"折叠区），同步模式文字（已由指示灯表达）

### 2. 分区卡片样式（统一规范）

**核心变化：** 同一 section 内的设置项**共享一个白色圆角容器**，内部用 1px `#F3F4F6` 分隔线区分。替代当前每个设置项独立一个灰色卡片的设计。

**设置项行样式：**
- 高度：padding 14px 16px
- 图标：36x36 圆角方形（borderRadius: 10），不同类别用不同背景色
  - 蓝色系 `#EEF4FF`：通用功能
  - 绿色系 `#ECFDF5`：同步相关
  - 黄色系 `#FEF3C7`：通知/标签
  - 青色系 `#EEF8FA`：显示相关
  - 红色系 `#FEF2F2`：危险操作
  - 灰色系 `#F3F4F6`：工具操作
- 标题：15px weight 600，颜色 `#374151`
- 副标题：12px，颜色 `#9CA3AF`

**Section 标题样式：**
- 字号 13px，weight 600，颜色 `#9CA3AF`
- 左侧无图标，纯文字
- 距上方 section 间距 28px，距下方容器 10px

### 3. 高级设置（可折叠区域）

- 默认收起，只显示"后端服务器"标题行 + 当前 URL 作为副标题
- 点击展开：URL 输入框 + 测试/保存按钮 + 最近使用列表
- 使用 `LayoutAnimation` 做展开/收起动画
- 折叠状态下右侧显示旋转箭头（收起 `›`，展开 `⌄`）

### 4. 分区合并映射

| 原 Section | 新归属 | 备注 |
|------------|--------|------|
| 概览卡片 | 用户档案卡 | 完全重新设计 |
| 账户与同步 | 账户与云同步 + 高级 | 后端配置拆出，其余保留 |
| 提醒 | 外观 | 推送通知合入外观 |
| 内容显示 | 外观 | 保持不变 |
| 数据与存储 | 数据管理 | 存储统计移至档案卡 |
| 标签管理 | 数据管理 | 合入 |
| 支持 | 关于与支持 | 保持不变 |
| 危险操作 | 数据管理 | 重置设置合入底部 |

### 5. 删除/简化的内容

- **SettingsStorageInfo 卡片**（存储统计表格）— 数据已提升到档案卡的统计行
- **概览卡中的"当前后端"行** — 移至高级折叠区
- **概览卡中的"同步模式"行** — 用档案卡的状态指示灯替代
- **独立的"提醒"section** — 只有一个设置项，合入"外观"
- **独立的"标签管理"section** — 只有一个设置项，合入"数据管理"
- **独立的"危险操作"section** — 只有一个设置项，合入"数据管理"

## 文件变更清单

### 新增文件
- `app/src/components/settings-page/SettingsProfileCard.tsx` — 用户档案卡组件
- `app/src/components/settings-page/SettingsAdvancedSection.tsx` — 高级设置可折叠区域
- `app/src/components/settings-page/SettingsGroupCard.tsx` — 统一的分组卡片容器（白色圆角，内部分隔线）

### 修改文件
- `app/src/components/settings-page/SettingsPageContent.tsx` — 重新组装分区顺序
- `app/src/components/settings-page/SettingsAccountSyncSection.tsx` — 移除后端配置，简化
- `app/src/components/settings-page/SettingsPage.styles.ts` — 更新样式
- `app/src/components/settings-page/SettingsSection.tsx` — 更新标题样式
- `app/src/components/settings-page/SettingRow.tsx` — 更新图标为圆角方形
- `app/src/components/settings-page/SettingsSegmentedSelector.tsx` — 适配新布局
- `app/src/components/settings-page/SettingsPhotoHeightSelector.tsx` — 适配新布局
- `app/src/components/settings-page/SettingsDataStorageSection.tsx` — 合入标签管理和重置

### 可能删除
- `app/src/components/settings-page/SettingsOverviewCard.tsx` — 被 SettingsProfileCard 替代
- `app/src/components/settings-page/SettingsStorageInfo.tsx` — 功能合入档案卡

## 验证方式

1. **视觉验证**：在 iOS 模拟器或设备上运行 `npx expo start`，打开设置页面检查布局
2. **状态测试**：
   - 已登录 + 云端模式：验证档案卡显示头像、邮箱、绿色指示灯、统计数据
   - 已登录 + 本地模式：验证灰色指示灯
   - 未登录状态：验证占位图标和登录入口
3. **交互测试**：
   - 高级设置折叠/展开动画流畅
   - 所有 Switch 开关正常工作
   - 所有导航项（同步状态、标签管理、帮助、关于）正常跳转
   - 后端服务器测试连接/保存功能正常
4. **现有测试**：运行 `cd app && npx jest --testPathPattern settings` 确保不破坏现有测试

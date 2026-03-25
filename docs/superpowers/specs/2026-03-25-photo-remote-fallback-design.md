# 云恢复照片远端回退设计

**日期**: 2026-03-25
**状态**: 已批准
**阶段**: Android 真机图片空白修复

## 目标

解决“云端恢复后的 photo 记录可以点开查看器，但图片空白”的问题。

这次修复只解决一个具体故障链路：

1. 云端恢复后的 photo 媒体可能仍保留旧本地 `file://` 路径
2. 当前图片卡片和图片查看器优先使用 `thumbnail` / `uri`
3. 当这些本地路径在新设备上失效时，渲染层不会回退到 `remoteUri` / `remoteThumbnail`
4. 结果就是列表里可能还能打开查看器，但查看器中的大图为空白

---

## 问题归因

目前语音与照片的恢复链路不一致：

- 语音在进入列表前会经过 `MediaCacheService.hydrateEntries()`，因此会下载远端媒体并把 `uri` 替换为当前设备可用的缓存路径
- 照片虽然理论上也应走同一条链路，但当前渲染层自身没有任何“本地路径失效后的远端回退”能力

这带来两个现实问题：

1. 只要恢复后的 photo `uri` 仍是旧设备路径，`Image` 就会直接加载失败
2. 查看器只吃单一 `imageUri` 字符串，失败后没有第二来源可以兜底

因此，这次修复不再假设“进入组件前一定已经被完美 hydrate”，而是在照片展示层增加明确的回退策略。

---

## 设计决策

采用“本地优先，失败后回退远端”的最小修复方案。

核心规则：

- 如果当前照片有可用的本地 `thumbnail` / `uri`，继续优先使用本地地址
- 如果图片组件触发加载失败，则立即切到 `remoteThumbnail` / `remoteUri`
- 如果没有远端地址，则保留当前缺图占位行为
- 图片卡片、日历照片卡、图片查看器共用同一套照片源选择逻辑

不采用“照片默认直接使用远端地址”的方案，因为那会绕过现有缓存路径，削弱离线能力，也会让列表滚动时更依赖网络。

---

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/src/services/photoService.ts` | 修改 | 新增统一的照片源选择与回退逻辑 |
| `app/src/components/photo-grid/PhotoGridCells.tsx` | 修改 | 单图、网格图在加载失败时回退到远端地址 |
| `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx` | 修改 | 日历照片卡改用统一照片源逻辑 |
| `app/src/components/entry-card/EntryCardDialogs.tsx` | 修改 | 查看器大图改用统一照片源逻辑 |
| `app/src/components/__tests__/PhotoGrid.test.tsx` | 修改 | 覆盖照片失败后回退到远端地址 |
| `app/src/components/__tests__/EntryCard.test.tsx` | 修改 | 覆盖查看器在本地路径失效时仍能拿到远端地址 |
| `app/src/services/__tests__/photoService.test.ts` | 修改 | 覆盖照片源选择辅助函数 |

---

## 一、统一照片源选择

推荐在 `PhotoService` 中新增一个纯函数，用于统一计算照片展示源：

```ts
PhotoService.getPreferredPhotoUri(media, kind)
```

其中：

- `kind = 'thumbnail'` 时优先顺序为：
  - `thumbnail`
  - `remoteThumbnail`
  - `uri`
  - `remoteUri`
- `kind = 'full'` 时优先顺序为：
  - `uri`
  - `remoteUri`

这个函数只负责“选择当前应使用哪个地址”，不负责组件级状态切换。

同时还需要一个配套函数：

```ts
PhotoService.getFallbackPhotoUri(media, failedUri, kind)
```

它在当前地址加载失败后，返回下一个候选地址，并避免返回与失败地址相同的值。

这样可以把组件里的判断收敛成：

1. 初始取首选地址
2. `onError` 时切到回退地址
3. 如果没有回退地址，再进入现有缺图占位

---

## 二、组件级行为

### 2.1 时间轴图片卡片

`PhotoGridCells.tsx` 中的 `SinglePhoto`、`GridCell`、`TwoPhotoCell` 都改成同一模式：

- 组件内部维护一个当前 `sourceUri`
- 初始值来自 `PhotoService.getPreferredPhotoUri(photo, 'thumbnail')`
- 首次失败时尝试切换到 `PhotoService.getFallbackPhotoUri(...)`
- 若仍无可用地址，才切换到当前的缺图占位

这样既保留了原本的本地优先，也能在恢复后的旧路径失效时自动切到云端地址。

### 2.2 日历照片卡

`EntryCardCalendarPhotoSection.tsx` 当前直接调用：

```ts
PhotoService.resolvePhotoUri(photo.thumbnail || photo.uri)
```

这里要改成与 `PhotoGrid` 一致的照片源策略，否则时间轴普通卡片与日历卡片会表现不一致。

### 2.3 图片查看器

`EntryCardDialogs.tsx` 当前传给查看器的仍是单一：

```ts
entry.media[selectedImageIndex]?.uri ?? entry.media[0].uri
```

这正是当前真机空白的高风险点。

这里需要改成优先使用：

```ts
PhotoService.getPreferredPhotoUri(media, 'full')
```

这样查看器打开时至少能优先拿到：

- 当前设备的本地缓存地址
- 或恢复后仍可访问的 `remoteUri`

查看器本身暂不引入二次失败切换状态，先确保入口给进去的就是正确的大图地址。

---

## 三、测试策略

这次必须先补失败测试，再改实现。

需要覆盖三类场景：

1. `PhotoService`：
   - 本地路径存在时优先返回本地地址
   - 本地地址失败后能回退到 `remoteUri` / `remoteThumbnail`
2. `PhotoGrid`：
   - 当首选地址加载失败且存在远端地址时，不立即进入缺图占位
   - 而是切换到远端地址重新渲染
3. `EntryCardDialogs` / `EntryCard`：
   - 当 media 同时有失效本地 `uri` 与有效 `remoteUri` 时
   - 打开图片查看器应传入远端大图地址，而不是旧本地地址

---

## 四、边界与非目标

本次不做以下事情：

- 不改动 `MediaCacheService` 的总体缓存策略
- 不新增照片下载日志体系
- 不把图片查看器改造成多阶段状态机
- 不处理服务端图片缩略图生成问题

原因是当前根因已经收敛到“前端照片渲染缺少远端回退”，继续扩大会把简单故障修复变成不必要重构。

---

## 五、验收标准

满足以下条件即视为修复完成：

1. Android 真机清空数据后，从云端恢复 photo 记录
2. 时间轴中的照片缩略图可以显示
3. 点击照片后，图片查看器中的大图可以显示
4. 现有 `EntryCard.test.tsx`、`PhotoGrid.test.tsx`、`photoService.test.ts` 全部通过


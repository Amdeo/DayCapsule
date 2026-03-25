# 开发环境图片链路调试日志设计

**日期**: 2026-03-25
**状态**: 已批准
**阶段**: 开发环境诊断增强

## 目标

为 Android 开发环境下的图片同步与查看链路增加定点调试日志，能够在一次真机复现里同时看清：

1. 数据库查询出来的 photo 记录到底带了什么 `media`
2. 媒体缓存层是否把远端地址转成了当前设备可用的本地缓存地址
3. 照片选源层最终把哪条路径交给了缩略图或查看器
4. 查看器渲染失败时，失败的是哪条路径

本次不是重构日志系统，只是补最小但高价值的开发期诊断埋点。

---

## 设计决策

采用“方案 A，定点诊断”：

- 只在几个真正决定图片能否显示的边界层打日志
- 仅在 `__DEV__` 环境输出
- 日志内容以 `entry.id`、媒体索引、原始路径、选中路径、缓存后路径为主
- 不把整条 store、UI、service 链路全部铺满日志

不采用全链路广撒日志，因为真机上日志噪音太大，反而会掩盖真正的断点。

---

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/src/database/operations.ts` | 修改 | 打印数据库查询结果中的 photo `media` 摘要 |
| `app/src/services/mediaCacheService.ts` | 修改 | 打印 photo 媒体 hydrate 前后的路径变化 |
| `app/src/services/photoService.ts` | 修改 | 打印首选路径与失败回退路径决策 |
| `app/src/components/entry-card/EntryCardDialogs.tsx` | 修改 | 打印查看器入口收到的原始 `media` 与最终 `imageUri` |
| `app/src/components/image-viewer/ImageViewerScene.tsx` | 修改 | 打印查看器 `<Image>` 的加载失败路径 |
| `app/src/database/__tests__/operations.test.ts` | 修改 | 覆盖 photo 查询日志 |
| `app/src/services/__tests__/mediaCacheService.test.ts` | 修改 | 覆盖 photo hydrate 日志 |
| `app/src/services/__tests__/photoService.test.ts` | 修改 | 覆盖首选/回退日志 |
| `app/src/components/__tests__/EntryCard.test.tsx` | 修改 | 覆盖查看器入口日志 |

---

## 一、数据库查询日志

在 `getEntriesPage()` 查询完成并映射为 `Entry[]` 后，针对 `type === 'photo'` 的记录打印一条摘要日志：

```ts
[db:getEntriesPage] photo media snapshot
```

日志内容包含：

- `entryId`
- `mediaCount`
- 每个媒体项的 `uri`
- `remoteUri`
- `thumbnail`
- `remoteThumbnail`

这里只打摘要，不打整行数据库对象，避免输出冗余字段。

---

## 二、媒体缓存日志

在 `MediaCacheService.hydrateEntry()` 中，针对 photo 记录补一条前后对比日志：

```ts
[mediaCache] photo hydrate summary
```

日志内容包含：

- `entryId`
- hydrate 前的 `uri` / `remoteUri` / `thumbnail` / `remoteThumbnail`
- hydrate 后的对应字段

这样能直接看出：

- 是否命中了远端地址
- 是否下载到了本地缓存
- 是否仍然保留旧本地路径

---

## 三、照片选源日志

`PhotoService.getPreferredPhotoUri()` 与 `getFallbackPhotoUri()` 是图片显示链路的决策点。

需要增加两类日志：

```ts
[photoService] preferred photo uri
[photoService] fallback photo uri
```

内容包含：

- `kind` (`thumbnail` / `full`)
- 原始候选路径数组
- 最终选择的路径
- 回退时的 `failedUri`

这样真机复现时可以直接知道：

- 查看器为什么拿了某条路径
- 缩略图为什么从本地切到远端

---

## 四、查看器入口与失败日志

### 4.1 查看器入口

在 `EntryCardDialogs.tsx` 中，photo 查看器打开前增加：

```ts
[EntryCardDialogs] opening image viewer
```

内容包含：

- `entryId`
- `selectedImageIndex`
- 当前选中的 `media`
- 最终传给 `ImageViewer` 的 `imageUri`

### 4.2 查看器加载失败

在 `ImageViewerScene.tsx` 的大图 `<Image>` 和开场 `<Animated.Image>` 上增加 `onError` 日志：

```ts
[ImageViewer] image load failed
```

内容包含：

- `phase`
- `imageUri`

不在这里做回退逻辑，这次只做诊断。

---

## 五、环境约束

这些日志仅在开发环境输出。

也就是说：

- `__DEV__ === true` 时输出
- release / 正式环境不增加额外日志噪音

实现上继续复用现有 `logger.log`，因为它本身已经只在开发环境打印。

---

## 六、验收标准

满足以下条件即可：

1. 真机点击 photo 卡片打开查看器时，能看到数据库摘要、hydrate 摘要、选源决策、查看器入口四类日志
2. 若图片加载失败，能看到失败的 `imageUri`
3. 新增日志不影响现有图片显示逻辑
4. 新增测试通过


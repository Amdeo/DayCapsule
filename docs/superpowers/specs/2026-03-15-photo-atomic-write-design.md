# 照片原子写入修复 — 设计文档

**日期：** 2026-03-15
**状态：** 已确认

## 背景

在 Android 上，`pnpm run android` 重新安装 app 后，刚添加的照片卡片显示正常但图片消失。SQLite 数据库条目保留（卡片仍在），但图片文件路径失效。

## 根本原因

`handlePhotoSelect`（`app/app/(tabs)/index.tsx`）采用两步写入逻辑：

1. `addEntry({ uri: result.uri })` — 先用相机/选图器返回的**临时 URI** 写入 DB
2. `savePhotoToStorage(result.uri, newEntry.id)` — 将文件复制到 `documentDirectory`
3. `updateEntry(newEntry.id, { uri: savedPhoto.originalUri })` — 用持久路径更新 DB

问题：若步骤 2 或 3 抛出异常，外层 `catch` 仅打 log，DB 中的条目保留了临时 URI。
Android 上 app 重启后，该临时路径失效，导致卡片存在但图片不显示。

iOS 上同样存在此问题，但 `resolvePhotoUri` 能一定程度兼容路径变化，掩盖了该缺陷。

## 目标

- 消除 DB 中出现临时 URI 的可能
- 简化写入逻辑，去除两步写入和 `allEntries[0]` 的脆弱取值
- 失败时给用户明确反馈，不留悬空记录

## 架构

### 新写入流程

```
savePhotoToStorage(fileId) → 成功 → addEntry(persistent URI)
                           → 失败 → Alert 提示，不写 DB
```

### 变更详情 — `app/app/(tabs)/index.tsx`

`handlePhotoSelect` 函数重写：

1. **预生成 `fileId`**：格式同 DB ID（`${Date.now()}_${Math.random().toString(36).slice(2, 8)}`），仅用于 `savePhotoToStorage` 的文件命名，与最终 entry ID 无关。

2. **先保存文件**：调用 `PhotoService.savePhotoToStorage(result.uri, fileId, quality, result.aspectRatio)`，得到 `savedPhoto.originalUri`（持久路径）。

3. **单次 `addEntry`**：直接传入 `savedPhoto.originalUri`，一次写入完成。

4. **删除 `updateEntry` 调用**：原有的更新步骤不再需要。

5. **删除 `allEntries[0]` 取值**：脆弱的"取刚添加条目"逻辑随之消除。

6. **失败处理**：`savePhotoToStorage` 失败时，`Alert.alert('保存失败', '照片保存失败，请重试')`，DB 不写入任何记录。

### 不变的部分

- `PhotoService.savePhotoToStorage` 实现不变
- `database/operations.ts` 的 `addEntry` 签名不变
- `updateEntry` 仍保留（供其他场景使用），本次不再在照片保存流程中调用
- `EntryCard`、`ImageViewer`、`settingsStore` 均不涉及

## 受影响文件

| 文件 | 改动类型 |
|------|---------|
| `app/app/(tabs)/index.tsx` | 重写 `handlePhotoSelect` 函数 |

## 测试要点

- 选图后 app 冷启动，图片仍可显示
- `savePhotoToStorage` 失败时弹出 Alert，不产生悬空卡片
- 正常保存流程：DB 中 `media.uri` 包含 `media/photos/original/`（持久路径），不含 `content://` 或 `cache`

## 不在范围内

- `savePhotoToStorage` 内部对 `content://` URI 的处理（当前 expo-image-picker 默认已复制为 `file://`）
- `ImageViewer` 中未使用 `resolvePhotoUri` 的问题（独立 bug）
- 多选图片场景的批量原子写入

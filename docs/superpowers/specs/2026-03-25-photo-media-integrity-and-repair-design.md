# 照片媒体链路完整性校验与修复设计

## 背景

当前照片链路已经暴露出两类问题：

1. 云端恢复后，渲染层可能继续优先使用远端受鉴权地址，导致图片卡片或查看器空白。
2. 某些云端媒体文件内容本身就是错误的，即远端文件可下载、可显示，但内容并不是这条记录原本的照片。

第一类问题已经通过前端选源优先级修复。第二类问题说明当前链路缺少端到端可追踪性与完整性校验，导致以下情况无法可靠识别：

- 拍照或选图后的源文件与最终上传文件是否一致
- 客户端声明上传的文件与服务端实际落盘的文件是否一致
- 云端恢复下载后的文件与服务端原文件、与本地健康原图是否一致
- 当云端文件异常但本地仍有正确原图时，是否可以安全修复

本设计的目标是把照片媒体链路做成“可观察、可验证、可修复”的闭环。

## 目标

- 防止后续新上传照片再次出现“传错图”或“落错图”
- 在同步下载后明确识别云端媒体内容异常，而不是只看接口返回成功
- 对已有坏数据给出可操作修复路径
- 在整个链路打印结构化日志和关键数据，便于直接定位问题
- 修复现有坏数据时，默认先征求用户确认，再执行覆盖修复

## 非目标

- 不做静默批量覆盖所有历史云端媒体
- 不对视频链路做同级别完整性改造
- 不依赖视觉模型或截图语义识别做异常判断

## 方案对比

### 方案 A：客户端最小修复

仅在前端补上传前校验、下载后校验和提示。

- 优点：改动小，落地快
- 缺点：服务端没有二次验收，坏数据仍可能成功落库

### 方案 B：客户端主导 + 服务端验收 + 人工确认修复

客户端记录源文件和最终本地文件指纹，服务端落盘后再次核验，同步下载后客户端再次核验；发现云端异常且本地仍有健康原图时，先提示用户确认，再重传修复。

- 优点：能覆盖预防、识别、修复三个阶段
- 缺点：前后端和本地媒体模型都要补字段与日志

### 方案 C：服务端中心方案

把主要校验都放到后端，前端只展示状态。

- 优点：规则集中
- 缺点：拿不到足够的本地上下文，修复能力弱

## 选型

采用方案 B。

原因：

- 只有客户端知道拍照/选图的原始来源与当前设备上的健康原图路径
- 只有服务端能保证“实际落盘内容”与“数据库记录”一致
- 下载后再次校验才能覆盖云端存错图、关联错图、内容被污染等问题

## 总体链路

照片链路拆成四个阶段：

1. `source-capture`
   - 获取拍照或相册返回的源文件
   - 记录源文件元数据和摘要
2. `local-persist`
   - 压缩、生成缩略图、落本地文件
   - 对最终要上传的本地文件再次计算元数据和摘要
3. `remote-upload`
   - 上传时把客户端声明的关键元数据一起带到服务端
   - 服务端落盘后再次读取文件并核验
4. `sync-restore-and-verify`
   - 云端恢复后下载媒体到当前设备
   - 对下载文件再次校验，并与本地健康原图、服务端摘要进行比对

## 数据模型变更

### 前端 `MediaInfo.metadata`

新增以下字段：

- `localMediaId`
  - 每张媒体在本地生成的稳定 ID
- `sourceHash`
  - 拍照或选图返回的原始文件 hash
- `persistedHash`
  - 压缩并保存到本地后的最终上传文件 hash
- `remoteHash`
  - 服务端确认的云端文件 hash
- `downloadedHash`
  - 当前设备下载后的文件 hash
- `integrityStatus`
  - `healthy | missing | upload_mismatch | download_mismatch | cloud_content_suspect | repair_prompt_required | repair_pending | repair_failed`
- `integrityReason`
  - 具体异常原因
- `lastVerifiedAt`
- `repairable`
  - 是否具备本地修复条件
- `repairSource`
  - 可用于修复的本地路径类型，例如 `local-original`

兼容策略：

- 老数据字段为空时，首次读取并完成验证后补算并回写
- 老数据若只有 `uri`/`remoteUri`，不阻塞使用，但不能跳过校验

### 后端 `media_files`

新增字段：

- `sha256`
- `width`
- `height`
- `validation_status`
- `validation_error`
- `validated_at`
- `client_local_media_id`
- `client_persisted_hash`
- `upload_trace_id`

服务端在上传请求完成前写入这些字段，保证“文件落盘”和“元数据校验”在同一事务语义内完成。

## 统一日志设计

前后端都使用结构化日志，事件名固定，便于检索和串联。

### 前端日志事件

- `photo.capture.received`
- `photo.persist.saved`
- `photo.db.entry_saved`
- `photo.upload.start`
- `photo.upload.finish`
- `photo.sync.download.finish`
- `photo.sync.verify.finish`
- `photo.render.source_selected`
- `photo.repair.prompted`
- `photo.repair.confirmed`
- `photo.repair.completed`
- `photo.repair.failed`

### 后端日志事件

- `media.upload.received`
- `media.upload.persisted`
- `media.upload.verified`
- `media.entry.linked`
- `media.repair.replaced`
- `media.cleanup.deleted`
- `media.cleanup.failed`

### 日志公共字段

每条日志至少带：

- `traceId`
- `entryId`
- `localMediaId`
- `mediaId`
- `sourceUri`
- `localUri`
- `remoteUri`
- `mimeType`
- `size`
- `width`
- `height`
- `sourceHash`
- `persistedHash`
- `remoteHash`
- `downloadedHash`
- `integrityStatus`
- `integrityReason`

要求：

- 同一条媒体从创建到修复，`traceId` 和 `localMediaId` 要能串起来
- 所有失败日志必须带错误栈或错误消息

## 校验规则

只做可证明异常判定，不做主观图像语义识别。

### 本地保存前后

若出现以下任一情况，直接判定失败：

- 文件不存在
- 文件大小为 0
- 读取 mime 失败
- 读取图片尺寸失败

### 上传后

服务端落盘后重新读取文件并比对：

- 客户端声明的 `persistedHash` 与服务端实算 `sha256` 不一致
- 客户端声明的 `size` 与服务端实算大小不一致
- mime 或图片尺寸读取失败

则标记为 `upload_mismatch`。

### 下载后

当前设备下载完成后重新读取本地文件并比对：

- 文件不存在或 0 字节，标记 `missing`
- 下载后的 `downloadedHash` 与服务端 `remoteHash` 不一致，标记 `download_mismatch`
- 若本地健康原图仍在，且 `persistedHash != remoteHash` 或 `persistedHash != downloadedHash`，标记 `cloud_content_suspect`

## 修复状态机

状态流转如下：

- `healthy`
- `cloud_content_suspect`
- `repair_prompt_required`
- `repair_pending`
- `repair_succeeded`
- `repair_failed`

规则：

- 只有当本地仍有健康原图且可读时，才能进入 `repair_prompt_required`
- 没有本地原图时，只提示异常，不提供自动修复

## 用户确认修复流程

发现 `cloud_content_suspect` 且 `repairable = true` 后：

1. 前端弹出确认框
2. 用户可选：
   - `稍后处理`
   - `立即修复`
3. 选择 `立即修复` 后进入 `repair_pending`

弹窗文案：

- 标题：`发现云端媒体异常`
- 内容：
  - `这条照片在云端的文件内容与本地原图不一致。`
  - `本地仍有可用原图，可以重新上传并修复云端数据。`
  - `是否现在修复？`

## 修复执行链路

用户确认修复后：

1. 前端再次确认本地原图存在、可读、可计算 hash
2. 前端打印 `photo.repair.confirmed`
3. 前端重新上传本地健康原图，并带上修复来源信息
4. 服务端落盘后再次校验，生成新的 `mediaId` 与 `remoteHash`
5. 服务端更新 entry 与新媒体的关联
6. 若旧媒体不再被任何 entry 引用，则删除旧数据库记录和旧文件
7. 前端刷新本地 entry 的 `remoteUri`、`remoteHash`、`integrityStatus`
8. 前端立即重新下载并再次校验，确认最终一致
9. 成功则转回 `healthy`，失败则转为 `repair_failed`

边界要求：

- 替换成功后才允许清理旧云端文件
- 旧文件清理失败不影响新文件生效，但必须记录日志并重试
- 对同一条媒体修复过程加锁，避免并发修复

## 前端改动点

### 1. `photoService`

- 增加本地文件 hash 与图片信息读取工具
- 在拍照/选图、压缩、保存后打印结构化日志
- 统一生成 `localMediaId`

### 2. `handlePhotoSelectForTest` / 创建照片记录流程

- 将 `sourceHash`、`persistedHash`、尺寸、大小写入 `media.metadata`
- 入库时打印 `photo.db.entry_saved`

### 3. `photoUploadQueue` / `dataSource`

- 上传请求补带客户端摘要和 `localMediaId`
- 上传成功后回填 `remoteHash`
- 若服务端回传校验失败，记录状态并阻止 entry 进入正常同步

### 4. `cloudMediaSyncService` / `syncBootstrapService`

- 下载后重新读取本地缓存文件
- 回写 `downloadedHash` 与 `integrityStatus`
- 将异常媒体写入同步状态摘要

### 5. UI

- 同步状态页显示媒体异常数量与最近错误
- 当记录具备 `repair_prompt_required` 状态时，展示修复入口
- 用户点击后弹出确认框

## 后端改动点

### 1. `media` 上传接口

- 接收客户端媒体摘要字段
- 文件落盘后再次读取并计算 `sha256`、尺寸、mime、大小
- 只在校验成功后写入最终元数据

### 2. `entry` 与 `sync_v2`

- 返回媒体元数据时带出 `remoteHash`、校验状态和错误信息
- 修复流程中允许替换已有 entry 的媒体关联

### 3. 删除旧媒体

- 沿用现有级联删除服务
- 新旧媒体切换成功后，再异步或事务后删除旧文件

## 迁移与兼容

- 数据库迁移新增媒体校验字段
- 老数据首次参与上传、下载或展示时补算 hash
- 对没有 hash 的历史数据，第一次比对完成后回写 metadata，避免重复冷启动成本

## 测试策略

### 前端

- `photoService`：
  - 生成并回填 hash
  - 保存后文件信息和 metadata 一致
- `photoUploadQueue`：
  - 上传时携带摘要
  - 服务端回传 mismatch 时状态正确
- `cloudMediaSyncService`：
  - 下载后文件缺失、hash 不一致、可修复场景
- `EntryCard` / 同步状态 UI：
  - 异常提示与修复确认弹窗

### 后端

- 上传接口：
  - 正常落盘并写入 `sha256/width/height`
  - 客户端声明与服务端实算不一致时返回失败或异常状态
- 修复替换：
  - 新媒体绑定成功后旧媒体清理
  - 旧媒体仍被引用时不删除

### 端到端

- 本地拍照上传 -> 云端同步下载 -> 校验一致
- 模拟“云端关联错图” -> 本地检测异常 -> 用户确认修复 -> 云端替换成功

## 实施顺序

1. 补前端本地摘要和结构化日志
2. 补后端上传后二次验收与元数据字段
3. 补下载后二次校验与同步状态展示
4. 补修复状态机、确认弹窗和重传覆盖
5. 补已有坏数据检测与修复入口

## 风险与缓解

### 风险 1：hash 计算增加耗时

- 仅对最终上传文件和下载完成文件计算
- 历史数据按需补算

### 风险 2：历史数据字段不完整

- 所有新字段按可选兼容
- 首次校验后逐步补全

### 风险 3：修复覆盖误删旧文件

- 新媒体绑定成功后才允许删除旧文件
- 清理失败采用重试，不回滚新绑定

## 结论

采用“客户端主导校验、服务端二次验收、下载后再次核验、修复前用户确认”的闭环方案。该方案可以同时解决：

- 后续上传再次传错图
- 同步完成但媒体内容异常无法识别
- 已存在坏数据缺少修复路径

并满足全链路打印日志和关键数据的要求。

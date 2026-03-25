# App 前后端接口详图设计

## 状态

- 当前状态：设计已确认
- 用户确认日期：2026-03-25
- 实现状态：待实现

## 评审记录

- 2026-03-25：用户要求在现有前后端同步总览图基础上，继续补充“前后端每个接口的图”。
- 2026-03-25：确认本次接口图范围覆盖现有总览图中已出现的全部接口，而不只限于当前同步主链路。
- 2026-03-25：确认拆分方式采用“混合拆分”——复杂主链路接口单独成页，简单接口按模块合并展示。
- 2026-03-25：确认单页表达风格要同时兼顾调用时序、关键请求/响应字段以及状态变化，而不是只画模块关系。
- 2026-03-25：确认产物采用新建 drawio 文件，而不是继续塞入现有总览文件。
- 2026-03-25：用户确认接口详图文件结构、单页模板、页分配和实现边界。

## 背景

当前 worktree 中已经有一份总览级 draw.io 产物：

- `docs/diagrams/app-frontend-backend-sync.drawio`

它已经完成两类信息：

- App 前后端交互与同步总览
- 用户可见操作流程

这份总览图适合回答“整体链路是什么”，但不适合回答“某个具体接口到底怎么走”。随着同步、媒体上传、鉴权和备份链路逐渐收口，现在需要补一份接口级详图，用来回答以下问题：

- 某个接口由哪个前端入口触发
- 请求前会经过哪些本地状态、队列或 service
- ApiClient 和后端 handler / service / repository 的责任如何串起来
- 请求/响应里哪些字段是理解链路所必需的
- 成功、失败、冲突、忽略等结果会把前端状态收敛到哪里

因此，本次子任务不再重画总览，而是新增一份接口详图文件，与现有总览图形成“总览 + 细节”的分层关系。

## 目标

- 新增一份专门的 draw.io 接口详图文件，覆盖现有总览图里出现的全部接口
- 让复杂接口能用时序图清楚展示前端、ApiClient、后端处理和本地状态收敛
- 在单页内补充最小必要的请求/响应字段摘要，避免接口图只有箭头没有语义
- 明确当前主链路接口与旧备份接口的区别，避免把非主链路误看成首页同步路径
- 与现有总览图协同，而不是把总览图继续堆成巨图

## 非目标

本次不在范围内：

- 不修改业务代码
- 不把接口详图扩展成完整 API 文档或字段字典
- 不重构现有 `app-frontend-backend-sync.drawio` 的页面结构
- 不补充代码里尚未落地的理想流程
- 不新增额外 markdown 使用说明，除非后续再单独提出

## 最终方案

### 1. 输出文件与分层关系

本次新增一个新的 draw.io 文件：

- `docs/diagrams/app-frontend-backend-interfaces.drawio`

分层关系固定为：

- `app-frontend-backend-sync.drawio`：负责全局总览与用户操作主流程
- `app-frontend-backend-interfaces.drawio`：负责接口级细化图

实现时只允许对现有总览图做最小联动，例如增加一句“接口级细化见新文件”的说明；不能把现有总览图整体重排成接口详图。

### 2. 覆盖范围

新文件需要覆盖现有总览图中已经出现的全部前后端接口，包括：

#### Auth

- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/refresh`

#### Media

- `/api/media/upload`
- `/api/media/:id`

#### Entries

- `/api/entries`
- `/api/entries/export`
- `/api/entries/import`
- `/api/entries/count`

#### Sync

- `/api/sync`

#### Legacy Backup

- `/api/sync/status`
- `/api/sync/upload`
- `/api/sync/download`
- `/api/sync/backup`

其中：

- `/api/sync` 属于当前核心主链路，必须单独高密度展开
- `Auth / Media / Entries / Legacy Backup` 采用“模块合并，但页内按接口拆块”的方式组织
- Legacy Backup 相关接口必须保留灰色 / 虚线语义，明确它们“已存在，但不是当前首页主同步链路”

### 3. 文件页结构

新文件采用单文件多页结构，固定为 6 页：

1. `索引`
   - 说明本文件用途
   - 标出与现有总览图文件的关系
   - 列出所有模块页

2. `Auth`
   - 覆盖 register / login / refresh
   - 重点体现 token 获取与 401 refresh 回路

3. `Media`
   - 覆盖 upload / fetch
   - 重点体现照片 / 语音媒体上传后的 remoteUri 或媒体标识回写

4. `Entries`
   - 覆盖 entries / export / import / count
   - 重点体现语音 entry 直写远端 entry 接口，以及导入导出/统计的辅助性质

5. `Sync V2`
   - 单独一页，只画 `/api/sync`
   - 这是全文件信息密度最高的一页

6. `Legacy Backup`
   - 覆盖 status / upload / download / backup
   - 必须弱化视觉权重，并标注为旧链路

### 4. 单页模板

除索引页外，其余接口页统一采用同一个版式模板：

#### 左侧：主调用时序

从左到右展示：

- 用户动作 / 系统触发
- 前端页面、store 或 service
- 本地数据层 / 队列 / 状态持久化
- `ApiClient`
- 后端 handler / service / repository
- 响应回前端后的结算动作

要求：

- 主链路必须一眼能看出入口、请求方向和结算方向
- 只画实际已落地的实现单元，不补理想中的抽象层
- 对多分支接口，只保留理解链路所必需的分支

#### 右上：请求 / 响应字段摘要

每页只保留理解链路所必需的最小字段集，例如：

- 鉴权页展示 token / refreshToken / Authorization Header
- 媒体页展示文件上传结果、remoteUri / mediaId 等关键回写字段
- `/api/sync` 页展示 `cursor`、`clientChanges[]`、`newCursor`、`results[]`、`serverChanges[]`、`conflicts[]`

这里的目标是“读图即可理解接口语义”，而不是穷举所有字段。

#### 右下：状态变化 / 异常分支

每页都需要明确：

- 前端本地状态如何变化
- 成功后状态收敛到哪里
- 失败、冲突、忽略、401 refresh 等关键分支如何回流

其中：

- `/api/media/upload` 重点体现 `pending_upload -> uploading -> pending / failed`
- `/api/sync` 重点体现 `applied / conflicted / ignored`
- Auth 页重点体现 401 后 refresh 再重试的闭环

### 5. `/api/sync` 单页的特殊要求

`/api/sync` 是当前主同步链路核心接口，需要比其他页更完整：

- 展示 `cloudSyncService` 如何扫描本地待同步记录并组装 `clientChanges[]`
- 展示请求如何经过 `ApiClient` 到后端 `Sync V2` handler / service
- 展示服务端事务写入 entry 与 change log 的处理结果
- 展示前端如何应用 `serverChanges[]`
- 展示 `results[]` 对应的三种结算：`applied` / `conflicted` / `ignored`
- 展示冲突时前端如何生成本地 conflict copy
- 展示 `newCursor` 的推进位置

这页允许信息密度高于其他页，但仍应保持“主时序在左、字段与状态在右”的阅读结构。

### 6. 视觉与标注规范

继续沿用现有总览图已经建立的颜色语义：

- 绿色：用户入口 / 触发
- 蓝色：前端 UI / store
- 紫色：本地数据层
- 橙色：同步与上传服务
- 青色：后端接口 / handler / service
- 灰色虚线：旧链路 / 辅助链路

补充约束：

- 同一模块内接口块的标题命名要统一，优先使用真实接口名
- 复杂页可以更宽，但不要把全部接口塞进单页巨图
- 每页都需要能脱离上下文独立阅读，避免只有“见上一页”才能懂的内容
- 说明文案面向产品和研发都可理解，避免只写内部实现缩写

### 7. 实现边界

实现时只做以下产物修改：

- 新建 `docs/diagrams/app-frontend-backend-interfaces.drawio`
- 如确有必要，对 `docs/diagrams/app-frontend-backend-sync.drawio` 增加一句指向新文件的说明

实现时不做以下动作：

- 不改前后端业务代码
- 不扩展为完整接口文档体系
- 不补画当前代码中不存在的处理链路
- 不为“每个 endpoint 严格一页”强行增加很多薄页

## 验收标准

完成后，应满足：

- 存在新的 `app-frontend-backend-interfaces.drawio` 文件
- 新文件包含 6 个逻辑页：索引、Auth、Media、Entries、Sync V2、Legacy Backup
- 每个接口页都同时包含调用时序、关键字段摘要和状态变化/异常分支
- `/api/sync` 页明显比其他页更完整，能单独说明主同步链路
- Legacy Backup 页视觉上被弱化，且明确标注为旧链路
- 新文件与现有总览文件职责边界清晰，没有把总览图重新塞成接口详图

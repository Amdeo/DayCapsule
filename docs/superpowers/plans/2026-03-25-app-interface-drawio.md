# App 前后端接口详图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一份独立的 draw.io 接口详图文件，覆盖当前总览图中出现的全部前后端接口，并用统一模板表达调用时序、关键请求/响应字段与状态变化。

**Architecture:** 保留现有 `docs/diagrams/app-frontend-backend-sync.drawio` 作为总览入口，新建 `docs/diagrams/app-frontend-backend-interfaces.drawio` 作为接口详图集。新文件固定为 6 页：索引、Auth、Media、Entries、Sync V2、Legacy Backup；复杂主链路 `/api/sync` 单独高密度展开，其余接口按模块合并，并沿用现有颜色语义。

**Tech Stack:** Draw.io XML (`.drawio`), diagrams.net, Python 3 XML structural checks

**Spec:** `docs/superpowers/specs/2026-03-25-app-interface-drawio-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `docs/diagrams/app-frontend-backend-interfaces.drawio` | 新的接口详图文件；固定包含 `索引 / Auth / Media / Entries / Sync V2 / Legacy Backup` 六页，负责接口级细化图 |

### Optional Modified Files

| File | When to touch | Change |
|------|---------------|--------|
| `docs/diagrams/app-frontend-backend-sync.drawio` | 只有在新文件索引页不足以让“总览图 vs 接口详图”的关系一眼看清时 | 在总览页增加一句极小提示：`接口级细化见 app-frontend-backend-interfaces.drawio` |

## 执行约束

- 所有 shell 命令都从 `app/` 目录执行；命令里访问图文件统一使用 `../docs/...` 路径。
- 本轮功能交付范围只包含 drawio 图产物；不要修改前后端业务代码，也不要额外改 spec、plan 或其他 markdown 文档。
- 接口覆盖粒度按“**path 级别**”认定；如果同一路径承载多个动作或方法，在同一模块页接口块中标明，不额外拆页。
- 除索引页外，每个页面都必须显式出现 3 个区块标题：
  - `主调用时序`
  - `请求 / 响应摘要`
  - `状态变化 / 异常分支`
- `/api/sync` 必须单独成页，且信息密度显著高于其他页。
- Legacy Backup 页必须继续使用灰色 / 虚线语义，并明确标注：`旧链路`、`非当前首页主同步链路`。
- 如果执行过程中发现现有总览图完全不需要联动，保持 `app-frontend-backend-sync.drawio` 不变。

## Testing Strategy

这次是 draw.io 产物，不新增测试文件。验证分三层：

1. **前置对齐检查**：先从现有总览图确认真实参与者命名、颜色语义和层次边界，再开始画新文件。
2. **按页 XML 校验**：用 Python 逐页读取 `diagram[name]` 内的 `mxCell.value`，分别断言每页的接口、字段、状态、模板标题都在正确页面中。
3. **人工验图**：在 diagrams.net 打开新文件全部 6 页；如果改了旧总览图，再额外打开旧文件总览页，检查布局和视觉语义。

> 关键原则：不要只做“全文件关键字搜索”；必须按页校验，避免把关键词都堆在索引页也误判通过。

## Chunk 0: 对齐真实实现单元与颜色语义

### Task 0: 先核对现有总览图里的真实参与者和颜色语义

**Files:**
- Read: `docs/diagrams/app-frontend-backend-sync.drawio`
- Read: `app/src/services/apiClient.ts`
- Read: `app/src/store/authStore.ts`
- Read: `app/src/services/cloudSyncService.ts`
- Read: `app/src/services/photoUploadQueue.ts`
- Read: `app/src/services/voiceUploadQueue.ts`
- Read: `app/src/database/operations.ts`
- Read: `backend/internal/handlers/auth.go`
- Read: `backend/internal/handlers/media.go`
- Read: `backend/internal/handlers/entry.go`
- Read: `backend/internal/handlers/sync_v2.go`
- Read: `backend/internal/service/auth_service.go`
- Read: `backend/internal/service/entry_service.go`
- Read: `backend/internal/service/sync_v2_service.go`
- Read: `backend/internal/repository/media_repo.go`
- Read: `backend/internal/repository/entry_repo.go`
- Read: `backend/internal/repository/change_repo.go`
- Test: `docs/diagrams/app-frontend-backend-sync.drawio`

- [ ] **Step 1: 读取现有总览图 + 真实实现文件，整理“可被画进图里的真实参与者清单”**

先同时阅读现有总览图和实际实现文件，只允许从这些已存在文件中提取参与者与层级，禁止凭感觉补不存在的节点。最少要从以下文件取证：

- 前端：
  - `app/src/services/apiClient.ts`
  - `app/src/store/authStore.ts`
  - `app/src/services/cloudSyncService.ts`
  - `app/src/services/photoUploadQueue.ts`
  - `app/src/services/voiceUploadQueue.ts`
  - `app/src/database/operations.ts`
- 后端：
  - `backend/internal/handlers/auth.go`
  - `backend/internal/handlers/media.go`
  - `backend/internal/handlers/entry.go`
  - `backend/internal/handlers/sync_v2.go`
  - `backend/internal/service/auth_service.go`
  - `backend/internal/service/entry_service.go`
  - `backend/internal/service/sync_v2_service.go`
  - `backend/internal/repository/media_repo.go`
  - `backend/internal/repository/entry_repo.go`
  - `backend/internal/repository/change_repo.go`

本步骤的输出必须是一份简单对照表，至少覆盖：

- Auth 页真实前端参与者 / 持久化位置 / 后端 handler / service
- Media 页真实上传参与者 / 本地媒体层 / 后端 handler / service / repository
- Entries 页真实前端入口 / 本地 DB 层 / 后端 handler / service
- Sync V2 页真实 `cloudSyncService`、本地 DB、后端 `handler -> service -> repository -> change log`
- Legacy Backup 页真实存在的旧接口入口与后端层级

如果某个层级在真实代码里没有明确独立单元，就不要把它画进图里。
- [ ] **Step 2: 从现有总览图提取“颜色 -> 语义”映射，并把映射写成新图的固定规则**

Run:

```bash
cd app && python - <<'PY'
import re
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-sync.drawio').getroot()
pages = {d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell')))) for d in root.findall('diagram')}
overview = pages.get('总览', '')
assert '图例' in overview, '总览页缺少图例块'
colors = set()
for cell in root.iter('mxCell'):
    style = cell.get('style') or ''
    for key in ('fillColor', 'strokeColor', 'fontColor'):
        m = re.search(rf'{key}=#([0-9a-fA-F]{{6}})', style)
        if m:
            colors.add(m.group(1).lower())
assert colors, '未读取到任何颜色样式'
print(sorted(list(colors))[:12])
PY
```

Expected:

- PASS
- 输出一组来自现有总览图的颜色值

本步骤的落地产物不是“拿到一组颜色值就结束”，而是必须在执行记录里明确写出并后续严格遵守这份映射：

- 用户入口 / 触发 -> 绿色系
- 前端 UI / Store -> 蓝色系
- 本地数据层 -> 紫色系
- 同步 / 上传服务 -> 橙色系
- 后端接口 / handler / service / repository -> 青色系
- 旧链路 / 非主链路 -> 灰色虚线

- [ ] **Step 3: 把这份对齐结果作为后续所有页面的命名和配色依据**

后续所有模块页都必须满足：

- 左侧主调用时序明确画出：触发 -> 前端参与者 -> 本地层 / 队列 / 状态持久化 -> `ApiClient` -> 后端接口 / handler / service / repository -> 响应后结算动作
- 颜色语义完全沿用现有总览图，不另起新配色
- 页面文案优先使用现有图中已经出现的命名风格

## Chunk 1: 新文件骨架与页名

### Task 1: 创建接口详图文件骨架并锁定 6 个目标页名

**Files:**
- Create: `docs/diagrams/app-frontend-backend-interfaces.drawio`
- Test: `docs/diagrams/app-frontend-backend-interfaces.drawio`

- [ ] **Step 1: 先写失败验证，锁定新文件存在性和页名**

先不创建文件，直接运行解析命令，后续通过条件是页名严格等于：

```python
['索引', 'Auth', 'Media', 'Entries', 'Sync V2', 'Legacy Backup']
```

- [ ] **Step 2: 运行命令确认当前失败**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio')
PY
```

Expected:

- FAIL，原因是文件尚不存在。

- [ ] **Step 3: 创建最小可解析的 `.drawio` 骨架文件**

新建 `docs/diagrams/app-frontend-backend-interfaces.drawio`，复用现有 `docs/diagrams/app-frontend-backend-sync.drawio` 的 `mxfile` / `mxGraphModel` 基础结构和默认画布参数，但先只放最小骨架与页标题。文件至少要具备：

```xml
<mxfile host="65bd71144e">
  <diagram id="interfaces-index" name="索引">...</diagram>
  <diagram id="interfaces-auth" name="Auth">...</diagram>
  <diagram id="interfaces-media" name="Media">...</diagram>
  <diagram id="interfaces-entries" name="Entries">...</diagram>
  <diagram id="interfaces-sync-v2" name="Sync V2">...</diagram>
  <diagram id="interfaces-legacy" name="Legacy Backup">...</diagram>
</mxfile>
```

每页先只放一个顶层标题节点，保证 diagrams.net 能正常打开，再逐页补内容。

- [ ] **Step 4: 重新运行页名校验，确认骨架正确**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio').getroot()
names = [d.get('name') for d in root.findall('diagram')]
expected = ['索引', 'Auth', 'Media', 'Entries', 'Sync V2', 'Legacy Backup']
assert names == expected, names
print(names)
PY
```

Expected:

- PASS
- 输出 `['索引', 'Auth', 'Media', 'Entries', 'Sync V2', 'Legacy Backup']`

- [ ] **Step 5: Commit**

```bash
cd app && git add ../docs/diagrams/app-frontend-backend-interfaces.drawio && git commit -m "docs: scaffold app interface drawio file"
```

## Chunk 2: 索引、Auth、Media 页面

### Task 2: 完成索引页与 Auth / Media 模块页

**Files:**
- Modify: `docs/diagrams/app-frontend-backend-interfaces.drawio`
- Test: `docs/diagrams/app-frontend-backend-interfaces.drawio`

- [ ] **Step 1: 先写失败验证，锁定索引 / Auth / Media 页的正确内容必须出现在正确页面**

页面最小要求：

- `索引` 页必须出现：
  - `App 前后端接口详图`
  - `app-frontend-backend-sync.drawio`
  - `Auth`
  - `Media`
  - `Entries`
  - `Sync V2`
  - `Legacy Backup`
- `Auth` 页必须出现：
  - `主调用时序`
  - `请求 / 响应摘要`
  - `状态变化 / 异常分支`
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/refresh`
  - `token`
  - `refreshToken`
  - `Authorization Header`
  - `401`
- `Media` 页必须出现：
  - `主调用时序`
  - `请求 / 响应摘要`
  - `状态变化 / 异常分支`
  - `/api/media/upload`
  - `/api/media/:id`
  - `remoteUri`
  - `mediaId`
  - `pending_upload`
  - `uploading`
  - `failed`

- [ ] **Step 2: 运行按页校验，确认当前失败**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio').getroot()
pages = {
    d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell'))))
    for d in root.findall('diagram')
}
required = {
    '索引': ['App 前后端接口详图', 'app-frontend-backend-sync.drawio', 'Auth', 'Media', 'Entries', 'Sync V2', 'Legacy Backup'],
    'Auth': ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/auth/register', '/api/auth/login', '/api/auth/refresh', 'token', 'refreshToken', 'Authorization Header', '401'],
    'Media': ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/media/upload', '/api/media/:id', 'remoteUri', 'mediaId', 'pending_upload', 'uploading', 'failed'],
}
for name, items in required.items():
    missing = [s for s in items if s not in pages.get(name, '')]
    assert not missing, (name, missing)
print('ok')
PY
```

Expected:

- FAIL，说明这三页还没有被正确填充。

- [ ] **Step 3: 用统一模板补齐索引 / Auth / Media**

在 `docs/diagrams/app-frontend-backend-interfaces.drawio` 中：

1. **索引页**
   - 标题固定写 `App 前后端接口详图`。
   - 用一块说明解释它和 `app-frontend-backend-sync.drawio` 的关系。
   - 列出模块页，并给出“接口 -> 页面”的映射概览。

2. **Auth 页**
   - 使用统一三分区模板：左侧 `主调用时序`、右上 `请求 / 响应摘要`、右下 `状态变化 / 异常分支`。
   - 左侧时序必须完整画出：用户或页面触发 -> `AuthStore` / 登录流程 -> 本地 token / MMKV 持久化 -> `ApiClient` -> 后端 Auth 接口（至少标出 handler / service）-> 响应后登录态结算。
   - 右上明确展示：`token`、`refreshToken`、`Authorization Header`。
   - 右下明确展示：登录成功、`401`、refresh 后重试闭环。

3. **Media 页**
   - 同样使用统一三分区模板。
   - 左侧必须完整画出：触发 -> 与现有图/实现命名一致的上传参与者 -> 本地媒体缓存 / 本地文件系统 / 状态持久化 -> `ApiClient` -> 后端 Media 接口（至少标出 handler / service）-> 响应后回写动作。
   - 左侧还必须同时画出：
     - 上传链路：上传参与者 -> `/api/media/upload`
     - 获取链路：`/api/media/:id` 的读取 / 访问入口
   - 右上明确展示：`remoteUri`、`mediaId`、上传结果。
   - 右下明确展示：`pending_upload -> uploading -> pending / failed`。

- [ ] **Step 4: 重新运行按页校验**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio').getroot()
pages = {
    d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell'))))
    for d in root.findall('diagram')
}
required = {
    '索引': ['App 前后端接口详图', 'app-frontend-backend-sync.drawio', 'Auth', 'Media', 'Entries', 'Sync V2', 'Legacy Backup'],
    'Auth': ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/auth/register', '/api/auth/login', '/api/auth/refresh', 'token', 'refreshToken', 'Authorization Header', '401'],
    'Media': ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/media/upload', '/api/media/:id', 'remoteUri', 'mediaId', 'pending_upload', 'uploading', 'failed'],
}
for name, items in required.items():
    missing = [s for s in items if s not in pages.get(name, '')]
    assert not missing, (name, missing)
print('ok')
PY
```

Expected:

- PASS
- 输出 `ok`

- [ ] **Step 5: Commit**

```bash
cd app && git add ../docs/diagrams/app-frontend-backend-interfaces.drawio && git commit -m "docs: add auth and media interface diagrams"
```

## Chunk 3: Entries 与 Sync V2 主链路页

### Task 3: 完成 Entries 页和 `/api/sync` 专页

**Files:**
- Modify: `docs/diagrams/app-frontend-backend-interfaces.drawio`
- Test: `docs/diagrams/app-frontend-backend-interfaces.drawio`

- [ ] **Step 1: 先写失败验证，锁定 Entries / Sync V2 页的正确内容必须出现在正确页面**

页面最小要求：

- `Entries` 页必须出现：
  - `主调用时序`
  - `请求 / 响应摘要`
  - `状态变化 / 异常分支`
  - `/api/entries`
  - `/api/entries/export`
  - `/api/entries/import`
  - `/api/entries/count`
  - `语音 entry 直写`
- `Sync V2` 页必须出现：
  - `主调用时序`
  - `请求 / 响应摘要`
  - `状态变化 / 异常分支`
  - `/api/sync`
  - `cloudSyncService`
  - `handler`
  - `service`
  - `repository`
  - `change log`
  - `cursor`
  - `clientChanges[]`
  - `results[]`
  - `serverChanges[]`
  - `应用 serverChanges[]`
  - `conflicts[]`
  - `newCursor`
  - `推进 newCursor`
  - `applied`
  - `conflicted`
  - `ignored`
  - `conflict copy`

- [ ] **Step 2: 运行按页校验，确认当前失败**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio').getroot()
pages = {
    d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell'))))
    for d in root.findall('diagram')
}
required = {
    'Entries': ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/entries', '/api/entries/export', '/api/entries/import', '/api/entries/count', '语音 entry 直写'],
    'Sync V2': ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/sync', 'cloudSyncService', 'handler', 'service', 'repository', 'change log', 'cursor', 'clientChanges[]', 'results[]', 'serverChanges[]', 'conflicts[]', 'newCursor', 'applied', 'conflicted', 'ignored', 'conflict copy'],
}
for name, items in required.items():
    missing = [s for s in items if s not in pages.get(name, '')]
    assert not missing, (name, missing)
print('ok')
PY
```

Expected:

- FAIL，说明 Entries / Sync V2 还没有按 spec 落到位。

- [ ] **Step 3: 补齐 Entries 页与 Sync V2 页**

在 `docs/diagrams/app-frontend-backend-interfaces.drawio` 中：

1. **Entries 页**
   - 使用统一三分区模板。
   - 左侧必须完整画出：触发 -> 前端页面 / store / service -> 本地 SQLite 或状态持久化 -> `ApiClient` -> 后端 Entries 接口（至少标出 handler / service）-> 响应后结算动作。
   - 必须覆盖 `/api/entries`、`/api/entries/export`、`/api/entries/import`、`/api/entries/count`。
   - `/api/entries` 的主例子必须明确画成 `语音 entry 直写` 远端 entry 接口，而不是泛泛的“某种 entry 写入”。
   - `export / import / count` 可以用辅助块呈现，但仍要在本页清楚标明用途。

2. **Sync V2 页**
   - 单独整页，只画 `/api/sync`。
   - 左侧时序必须完整体现：触发 -> 本地待同步记录 / 状态持久化 -> `cloudSyncService` -> `ApiClient` -> 后端 `handler -> service -> repository` -> 前端回写。
   - 后端处理块必须明确出现 `change log`，体现“写 entry + 记录 change log”的语义。
   - 左侧或右下必须明确画出两件事：`应用 serverChanges[]`、`推进 newCursor`，不能只把这两个词放在字段摘要里。
   - 右上必须展示：`cursor`、`clientChanges[]`、`results[]`、`serverChanges[]`、`conflicts[]`、`newCursor`。
   - 右下必须展示：`applied`、`conflicted`、`ignored`、`conflict copy`。
   - 这一页允许信息密度最高，但仍保持“左时序、右摘要/状态”的结构，不要把所有内容塞成一团。

- [ ] **Step 4: 重新运行按页校验**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio').getroot()
pages = {
    d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell'))))
    for d in root.findall('diagram')
}
required = {
    'Entries': ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/entries', '/api/entries/export', '/api/entries/import', '/api/entries/count', '语音 entry 直写'],
    'Sync V2': ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/sync', 'cloudSyncService', 'handler', 'service', 'repository', 'change log', 'cursor', 'clientChanges[]', 'results[]', 'serverChanges[]', 'conflicts[]', 'newCursor', 'applied', 'conflicted', 'ignored', 'conflict copy'],
}
for name, items in required.items():
    missing = [s for s in items if s not in pages.get(name, '')]
    assert not missing, (name, missing)
print('ok')
PY
```

Expected:

- PASS
- 输出 `ok`

- [ ] **Step 5: Commit**

```bash
cd app && git add ../docs/diagrams/app-frontend-backend-interfaces.drawio && git commit -m "docs: add entries and sync interface diagrams"
```

## Chunk 4: Legacy Backup 页

### Task 4: 完成 Legacy Backup 页并锁定旧链路语义

**Files:**
- Modify: `docs/diagrams/app-frontend-backend-interfaces.drawio`
- Test: `docs/diagrams/app-frontend-backend-interfaces.drawio`

- [ ] **Step 1: 先写失败验证，锁定 Legacy Backup 页必须出现在正确页面**

`Legacy Backup` 页必须出现：

- `主调用时序`
- `请求 / 响应摘要`
- `状态变化 / 异常分支`
- `/api/sync/status`
- `/api/sync/upload`
- `/api/sync/download`
- `/api/sync/backup`
- `旧链路`
- `非当前首页主同步链路`

- [ ] **Step 2: 运行按页校验，确认当前失败**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio').getroot()
pages = {
    d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell'))))
    for d in root.findall('diagram')
}
required = ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/sync/status', '/api/sync/upload', '/api/sync/download', '/api/sync/backup', '旧链路', '非当前首页主同步链路']
missing = [s for s in required if s not in pages.get('Legacy Backup', '')]
assert not missing, missing
print('ok')
PY
```

Expected:

- FAIL，说明 Legacy 页还没有被正确填充。

- [ ] **Step 3: 补齐 Legacy Backup 页**

在 `docs/diagrams/app-frontend-backend-interfaces.drawio` 中：

- 使用统一三分区模板。
- 左侧必须完整画出：触发 -> 前端入口 / 相关状态持久化 -> `ApiClient` -> Legacy Backup 后端接口（至少标出 handler / service）-> 响应后结算动作。
- 覆盖 `/api/sync/status`、`/api/sync/upload`、`/api/sync/download`、`/api/sync/backup`。
- 文案必须显式写出：`旧链路`、`非当前首页主同步链路`。
- 视觉上使用灰色 / 虚线 / 次级权重，和主链路页面明显区分。

- [ ] **Step 4: 重新运行按页校验**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio').getroot()
pages = {
    d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell'))))
    for d in root.findall('diagram')
}
required = ['主调用时序', '请求 / 响应摘要', '状态变化 / 异常分支', '/api/sync/status', '/api/sync/upload', '/api/sync/download', '/api/sync/backup', '旧链路', '非当前首页主同步链路']
missing = [s for s in required if s not in pages.get('Legacy Backup', '')]
assert not missing, missing
print('ok')
PY
```

Expected:

- PASS
- 输出 `ok`

- [ ] **Step 5: Commit**

```bash
cd app && git add ../docs/diagrams/app-frontend-backend-interfaces.drawio && git commit -m "docs: add legacy backup interface diagrams"
```

## Chunk 5: 人工验图与可选总览联动

### Task 5: 完成最终验图，并只在必要时给旧总览图加入口提示

**Files:**
- Modify (optional): `docs/diagrams/app-frontend-backend-sync.drawio`
- Test: `docs/diagrams/app-frontend-backend-interfaces.drawio`
- Test (optional): `docs/diagrams/app-frontend-backend-sync.drawio`

- [ ] **Step 1: 运行最终按页结构校验，锁定 6 页和全部接口覆盖**

Run:

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-interfaces.drawio').getroot()
pages = {
    d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell'))))
    for d in root.findall('diagram')
}
assert list(pages) == ['索引', 'Auth', 'Media', 'Entries', 'Sync V2', 'Legacy Backup'], list(pages)
required = {
    'Auth': ['/api/auth/register', '/api/auth/login', '/api/auth/refresh'],
    'Media': ['/api/media/upload', '/api/media/:id'],
    'Entries': ['/api/entries', '/api/entries/export', '/api/entries/import', '/api/entries/count'],
    'Sync V2': ['/api/sync'],
    'Legacy Backup': ['/api/sync/status', '/api/sync/upload', '/api/sync/download', '/api/sync/backup'],
}
for name, items in required.items():
    missing = [s for s in items if s not in pages.get(name, '')]
    assert not missing, (name, missing)
print('ok')
PY
```

Expected:

- PASS
- 输出 `ok`

- [ ] **Step 2: 在 diagrams.net 打开新文件全部 6 页，做人工验图**

打开 `../docs/diagrams/app-frontend-backend-interfaces.drawio`，逐页检查：

- 六个页面都能正常打开
- 每个非索引页都能一眼看出三分区：`主调用时序` / `请求 / 响应摘要` / `状态变化 / 异常分支`
- 每个非索引页左侧都能独立读出完整链路：触发 -> 前端参与者 -> 本地层 / 队列 / 状态持久化 -> `ApiClient` -> 后端接口 / handler / service / repository -> 响应后结算动作
- 所有页面都继续沿用现有总览图的颜色语义，而不是临时发明新配色；其中 `Legacy Backup` 仍然是灰色 / 虚线弱化
- `Media` 页同时存在上传链路和 `/api/media/:id` 的获取链路
- `Entries` 页明确出现 `语音 entry 直写`
- `Sync V2` 页明显比其他页更完整，且包含 `cloudSyncService -> handler -> service -> repository -> change log`
- `Sync V2` 页明确画出了前端 `应用 serverChanges[]` 和 `推进 newCursor` 的位置/结果，而不只是出现这两个关键词
- 每个页面都能脱离上下文独立阅读，不需要靠“见上一页”才能理解接口含义
- 没有关键节点重叠、被截断、超出画布或箭头严重交叉导致不可读

如果发现布局问题，只做最小布局修正，不新增额外页面。

- [ ] **Step 3: 判断是否需要给旧总览图增加入口提示**

打开 `../docs/diagrams/app-frontend-backend-sync.drawio` 的总览页，只判断一件事：

- 不看口头解释时，工程师是否能从新文件索引页直接理解“总览图”和“接口详图”的关系？

决策规则：

- **如果答案是能**：保持旧文件不变，直接进入 Step 5。
- **如果答案是不能**：执行 Step 4，在旧总览图总览页增加一句小提示。

- [ ] **Step 4: 仅在必要时，为旧总览图增加最小入口提示并验证**

只在 Step 3 判断“需要”时执行：

- 在 `docs/diagrams/app-frontend-backend-sync.drawio` 总览页加一个小说明块：
  - `接口级细化见 app-frontend-backend-interfaces.drawio`
- 不改总览页主布局，不重排现有大块。

验证命令：

```bash
cd app && python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('../docs/diagrams/app-frontend-backend-sync.drawio').getroot()
pages = {
    d.get('name'): ' '.join(filter(None, (c.get('value') for c in d.iter('mxCell'))))
    for d in root.findall('diagram')
}
overview = pages.get('总览', '')
required = ['接口级细化', 'app-frontend-backend-interfaces.drawio']
missing = [s for s in required if s not in overview]
assert not missing, missing
print('ok')
PY
```

Expected:

- PASS
- 输出 `ok`

- [ ] **Step 5: Commit**

如果旧总览图**未修改**：

```bash
cd app && git add ../docs/diagrams/app-frontend-backend-interfaces.drawio && git commit -m "docs: finalize app interface diagram set"
```

如果旧总览图**已修改**：

```bash
cd app && git add ../docs/diagrams/app-frontend-backend-interfaces.drawio ../docs/diagrams/app-frontend-backend-sync.drawio && git commit -m "docs: finalize app interface diagram set"
```

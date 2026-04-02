# 手测文档索引

这个目录用于集中管理云同步相关的手动测试文档。

---

## 推荐入口

如果你准备开始执行手测，建议先看：

1. `docs/manual-test/cloud-sync-recommended-order.md`
2. `docs/manual-test/cloud-sync-checklist.md`

---

## 文档说明

### 1. 快速执行版

文件：`docs/manual-test/cloud-sync-checklist.md`

用途：

- 适合开发自己手测时直接逐条打勾
- 覆盖高价值主链路场景
- 重点关注首次同步、文本同步、删除、媒体、冲突、失败恢复

适用场景：

- 你今天就想开始测
- 先做一轮冒烟和主链路验证

---

### 2. 正式表格版

文件：`docs/manual-test/cloud-sync-test-cases.md`

用途：

- 适合发给测试同学执行
- 每条用例都有编号、目标、前置条件、步骤、预期结果、实际结果、结论
- 方便归档和跟踪

适用场景：

- 要正式提测
- 需要标准化记录测试结果

---

### 3. 冲突专项

文件：`docs/manual-test/cloud-sync-conflict-test-cases.md`

用途：

- 专门覆盖多端同时编辑、删除与编辑竞争、带媒体记录冲突
- 重点验证冲突后的最终收敛、冲突副本、状态页可见性

适用场景：

- 主链路通过后，准备专项验证冲突处理
- 已经发现“内容被覆盖”“删了又回来”“两端不一致”这类问题

---

### 4. 媒体专项

文件：`docs/manual-test/cloud-sync-media-test-cases.md`

用途：

- 专门覆盖照片与语音的上传、跨端查看、播放、恢复、中断、失败感知
- 重点验证媒体文件与记录元数据是否能一起收敛

适用场景：

- 已发现图片空白、语音不可播放、上传卡住等问题
- 主链路通过后准备补媒体边界场景

---

### 5. 推荐执行顺序

文件：`docs/manual-test/cloud-sync-recommended-order.md`

用途：

- 告诉你先测什么、后测什么
- 按“主链路 -> 恢复与冲突 -> 媒体补洞”的顺序组织
- 帮你在最短时间内发现高风险问题

适用场景：

- 不确定今天从哪开始测
- 想先用最少时间覆盖最多风险

---

## 建议使用方式

### 开发自测

1. 先看 `cloud-sync-recommended-order.md`
2. 按 `cloud-sync-checklist.md` 逐条执行
3. 如果遇到冲突问题，切到 `cloud-sync-conflict-test-cases.md`
4. 如果遇到图片/语音问题，切到 `cloud-sync-media-test-cases.md`

### 测试同学执行

1. 先看 `cloud-sync-recommended-order.md`
2. 再按 `cloud-sync-test-cases.md` 正式记录结果
3. 有专项问题时补充执行冲突专项和媒体专项

---

## 当前文档清单

- `docs/manual-test/README.md`
- `docs/manual-test/cloud-sync-checklist.md`
- `docs/manual-test/cloud-sync-test-cases.md`
- `docs/manual-test/cloud-sync-conflict-test-cases.md`
- `docs/manual-test/cloud-sync-media-test-cases.md`
- `docs/manual-test/cloud-sync-recommended-order.md`

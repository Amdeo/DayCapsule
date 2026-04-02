# 云同步手测推荐执行顺序

## 文档导航

- 快速执行：`docs/manual-test/cloud-sync-checklist.md`
- 正式用例表：`docs/manual-test/cloud-sync-test-cases.md`
- 冲突专项：`docs/manual-test/cloud-sync-conflict-test-cases.md`
- 媒体专项：`docs/manual-test/cloud-sync-media-test-cases.md`
- 推荐执行顺序：`docs/manual-test/cloud-sync-recommended-order.md`

本文档用于指导你按“先主链路、后复杂链路、最后专项补洞”的顺序执行手测，尽量在最短时间内暴露高风险问题。

---

## 总体策略

推荐按三轮执行：

1. 第一轮：验证主链路是否通
2. 第二轮：验证恢复与冲突
3. 第三轮：验证媒体专项和统计准确性

如果第一轮已有明显失败，建议先停下来修主问题，不要继续做大量边界场景。

---

## 第一轮：主链路冒烟

目标：先确认“首次同步、文本同步、删除同步、媒体同步”这些最核心路径没有大问题。

建议顺序：

1. `cloud-sync-checklist.md` 用例 1：本地为空，从云恢复
2. `cloud-sync-checklist.md` 用例 2：本地有数据，备份到云端
3. `cloud-sync-checklist.md` 用例 3：新增文本记录
4. `cloud-sync-checklist.md` 用例 4：编辑文本记录
5. `cloud-sync-checklist.md` 用例 5：删除已同步文本记录
6. `cloud-sync-checklist.md` 用例 6：新增单张照片记录
7. `cloud-sync-checklist.md` 用例 7：新增语音记录并跨端播放

第一轮通过标准：

- [ ] 首次同步的两条主路径可用
- [ ] 文本新增/编辑/删除都能跨端收敛
- [ ] 照片与语音至少基础链路可用

---

## 第二轮：恢复与冲突

目标：验证异常和多端竞争条件下，系统是否稳定。

建议顺序：

1. `cloud-sync-checklist.md` 用例 9：断网后恢复同步
2. `cloud-sync-checklist.md` 用例 10：重启后恢复未完成同步
3. `cloud-sync-conflict-test-cases.md` 场景 1：双端同时编辑同一条文本
4. `cloud-sync-conflict-test-cases.md` 场景 3：A 删除，B 同时编辑
5. `cloud-sync-conflict-test-cases.md` 场景 7：冲突后再次编辑
6. `cloud-sync-conflict-test-cases.md` 场景 8：检查冲突在状态页与列表中的可见性

第二轮通过标准：

- [ ] 网络恢复后任务能继续
- [ ] App 重启后任务不丢
- [ ] 冲突不会导致两端长期不一致
- [ ] 冲突对用户可见，不是静默失败

---

## 第三轮：媒体专项补洞

目标：在主链路和冲突都基本通过后，再补媒体边界场景。

建议顺序：

1. `cloud-sync-media-test-cases.md` 场景 2：新增多张照片记录
2. `cloud-sync-media-test-cases.md` 场景 3：编辑带照片记录的文字或标签
3. `cloud-sync-media-test-cases.md` 场景 4：弱网或断网下新增照片记录
4. `cloud-sync-media-test-cases.md` 场景 6：录制完成后立即切后台或退出
5. `cloud-sync-media-test-cases.md` 场景 7：断网下新增语音记录
6. `cloud-sync-media-test-cases.md` 场景 9：媒体异常时的用户可感知性
7. `cloud-sync-conflict-test-cases.md` 场景 5：双端同时编辑带照片的记录
8. `cloud-sync-conflict-test-cases.md` 场景 6：A 删除照片记录，B 同时编辑文字

第三轮通过标准：

- [ ] 多图同步稳定
- [ ] 媒体记录元数据更新不影响媒体可用性
- [ ] 弱网和中断场景下媒体仍可恢复
- [ ] 带媒体的冲突场景不会破坏图片或语音可用性

---

## 如果你今天时间有限

只测这 6 个高价值场景：

1. 首次同步：本地为空，从云恢复
2. 首次同步：本地有数据，备份到云端
3. 新增文本记录
4. 新增单张照片记录
5. 双端同时编辑同一条文本
6. 断网后恢复同步

这 6 个最容易在最短时间内暴露严重问题。

---

## 如果第一轮已经失败，建议停下来的情况

遇到下面任一问题，建议先修复，不要继续后面的边界场景：

- 首次同步路径直接失败
- 文本新增无法跨端同步
- 编辑后内容回退或丢失
- 删除后记录反复出现
- 单图记录在另一端长期不可用
- 语音记录跨端无法播放

---

## 执行记录建议

每轮执行时记录：

- 本轮开始时间
- 执行的文档与用例编号
- 失败用例编号
- 是否可复现
- 是否阻断后续测试

推荐记录模板：

```md
测试轮次：第一轮 / 第二轮 / 第三轮
开始时间：
结束时间：

执行用例：
- 

失败用例：
- 

阻断项：有 / 无

备注：
```

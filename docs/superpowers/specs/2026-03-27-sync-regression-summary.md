# 同步专项回归说明

**日期**: 2026-03-27  
**范围**: 2026-03-27 本轮云同步稳定性修复后的专项回归总结

## 本轮落地项

### P0 必改

1. `pending_delete` 墓碑不再因列表分页查询重新出现
   - `getEntriesPage()` 已补 `deleted = 0` 过滤
   - 已覆盖“标记 `pending_delete` 后重新加载列表不应再出现”的测试

2. 语音上传成功后的本地落库链路已修正
   - 语音上传不再走“删本地再远端重建 entry”
   - 已统一到与照片一致的本地优先模型：`pending_upload -> uploading -> pending -> synced`

3. 照片上传完成时与 `syncNow()` 并发的漏同步窗口已修复
   - `cloudSyncService.syncNow()` 增加尾触发机制
   - 同步进行中新增的 `pending` 变更会在当前轮结束后自动补跑下一轮

### P1 建议改

1. 照片和语音同步模型已统一
   - 两者均走“本地优先 + /sync 收口”
   - 避免了语音保留远端新 ID、照片保留本地 ID 的分叉

2. 冲突处理策略已明确并实现
   - 已从“生成 `conflict-local-copy`”改为 `Last Write Wins`
   - 客户端修改时间更晚时覆盖服务器版本
   - 客户端修改时间更早或相等时忽略本地更新

3. 自动重试已完成保守版
   - 已实现：应用启动、回到前台、网络恢复时自动补跑上传队列与同步
   - 已加 in-flight 防抖，避免同一轮恢复动作并发执行

### P2 可暂缓

1. 媒体校验时机已做展示层优化
   - 未阻塞元数据入站
   - 当图片/语音媒体仍为 remote-only、尚未本地落地时，会显示占位或“准备中”
   - 会阻止过早打开图片查看器或触发语音播放

2. 同步状态展示已细化
   - 顶部同步状态现在会纳入媒体校验摘要
   - `running` 视为 `syncing`
   - `partial / failed` 视为 `failed`

## 当前未完成项

本轮清单里仅剩一项未做：

- 未实现“定时器退避重试”
  - 当前只做了保守自动重试
  - 如果应用长期停留后台，且没有再次触发启动、前台恢复或网络恢复入口，则失败上传不会自行轮询补跑

## 残余风险

1. `Last Write Wins` 会把原来的显式冲突转为自动覆盖
   - 优点：不再生成冲突副本，用户路径更直接
   - 风险：被覆盖版本不会再单独保留

2. 媒体状态仍然不是逐媒体的长期状态机
   - 现在仍是“最近一轮媒体校验摘要”
   - 适合当前规模，但不适合后续做精细媒体运营状态

3. 自动重试仍依赖恢复入口
   - 已覆盖启动、前台、网络恢复
   - 未覆盖后台定时轮询

## 建议手测清单

1. 删除一条已同步记录，切换筛选或重进首页，确认不会重新出现
2. 云模式下录一条语音，观察状态从 `待上传 -> 上传中 -> 已同步`
3. 云模式下拍一张图，在同步进行中补拍一张图，确认后补的也能被推送
4. 断网后创建照片或语音，恢复网络，确认会自动补跑
5. 两端修改同一条文本，确认晚修改的版本最终生效
6. 云端新下发图片时，先显示占位，再变成可点图片
7. 云端新下发语音时，先显示“准备中”，落地后才能播放
8. 顶部同步状态在媒体校验中显示同步中，在媒体异常时不显示“已完成”

## 自动化回归命令

### 前端

```bash
cd app
npm test -- --runInBand --runTestsByPath \
  src/store/__tests__/cloudSyncIndicatorStore.test.ts \
  src/services/__tests__/showCloudSyncStatusAlert.test.ts \
  src/services/__tests__/cloudSyncService.test.ts \
  src/components/__tests__/PhotoGrid.test.tsx \
  src/components/__tests__/EntryCard.test.tsx \
  app/__tests__/_layout.photo-upload.test.tsx

npm run typecheck
```

### 后端

```bash
cd backend
go test ./internal/service ./internal/handlers
```

## 本次确认结果

- 主分支：`main`
- 当前工作区：干净
- 最近相关合并：
  - `8b559e3` `Merge branch 'fix/sync-conflict-lww'`
  - `d129533` `Merge branch 'fix/sync-p0-fixes'`

# 云端录音停止即时性修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复云端模式下点击语音卡片“停止”后录音仍继续增长的问题，让停采在点击时刻立即发生，并让 UI 立即退出录音中状态。

**Architecture:** 保持现有“本地 cache + `voiceUploadQueue` 后台上传”架构不变，只把停止链路拆成“即时停采”和“后续收尾”两段。前端本地状态新增短暂 `stopping`，`VoiceService` 负责先释放 recorder 再做文件信息收尾，主页录音链路负责立即冻结 timer 并切状态。

**Tech Stack:** React Native, Expo Router, TypeScript, expo-audio, Zustand, Jest, @testing-library/react-native

---

**Spec:** `docs/superpowers/specs/2026-03-22-voice-stop-immediacy-design.md`

## File Map

| Path | Responsibility |
| --- | --- |
| `app/src/services/voiceService.ts` | 录音底层控制；把 stop 拆成先停采后收尾，确保 `getRecordingDuration()` 在 stop 过程中立即归零 |
| `app/src/services/__tests__/voiceService.test.ts` | 锁定 stop 过程中 recorder 生命周期和时长冻结行为 |
| `app/src/types/entry.ts` | 为本地 UI 补 `recordingStatus = 'stopping'` 类型 |
| `app/app/(tabs)/index.tsx` | 云端模式 stop 编排；立即停 timer、切 `stopping`、再等待 stop 后续收尾 |
| `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` | 锁定“点停止先切状态再等待 stop 完成”的链路行为 |
| `app/src/components/EntryCard.tsx` | `stopping` 状态的显示与 stop 按钮禁用 |
| `app/src/components/__tests__/EntryCard.test.tsx` | 锁定 `处理中...` 文案与禁用交互 |
| `docs/superpowers/specs/2026-03-22-voice-stop-immediacy-design.md` | 实现后更新状态、偏差说明与最终验证结果 |
| `docs/superpowers/plans/2026-03-22-voice-stop-immediacy.md` | 执行时逐项勾选并补验证记录 |

## Chunk 1: 底层停采语义

### Task 1: 锁定 `VoiceService` 的即时停采行为

**Files:**
- Modify: `app/src/services/__tests__/voiceService.test.ts`
- Modify: `app/src/services/voiceService.ts`

- [ ] **Step 1: 写失败测试，锁定 stop 过程中时长应立即冻结**

```ts
it('returns 0 duration while stopRecording is still finalizing', async () => {
  const deferred = createDeferred<{ size: number }>();
  (getFileInfo as jest.Mock).mockReturnValue(deferred.promise);

  await VoiceService.startRecording();
  const stopPromise = VoiceService.stopRecording();

  await Promise.resolve();
  await expect(VoiceService.getRecordingDuration()).resolves.toBe(0);

  deferred.resolve({ size: 2048 });
  await expect(stopPromise).resolves.toMatchObject({ size: 2048 });
});
```

- [ ] **Step 2: 运行测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceService.test.ts -t "returns 0 duration while stopRecording is still finalizing"`

Expected: FAIL，当前实现里 `stopRecording()` 在 `getFileInfo()` 完成前仍保留 `this.recorder`，`getRecordingDuration()` 还能读到旧时长。

- [ ] **Step 3: 用最小实现把 stop 拆成“先停采、后收尾”**

```ts
static async stopRecording(): Promise<AudioFile> {
  if (!this.recorder) throw new Error('No active recording');

  const recorder = this.recorder;
  const initialStatus = recorder.getStatus();
  const duration = (initialStatus.durationMillis || 0) / 1000;

  await recorder.stop();

  this.recorder = null;
  this.recordingSession = null;

  const finalStatus = recorder.getStatus();
  const uri = recorder.uri || finalStatus.url;
  const { size } = await getFileInfo(uri);

  return { uri, size, duration, mimeType: 'audio/m4a' };
}
```

实现要求：
- `await recorder.stop()` 之后立即清掉 `this.recorder` / `this.recordingSession`
- 后续 `getStatus()`、`uri`、`getFileInfo()` 全部使用局部变量 `recorder`
- 不改变现有返回结构和调用方接口

- [ ] **Step 4: 回跑 `voiceService` 测试**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/services/__tests__/voiceService.test.ts`

Expected: PASS

- [ ] **Step 5: 提交底层 stop 语义修复**

```bash
git add app/src/services/voiceService.ts app/src/services/__tests__/voiceService.test.ts
git commit -m "fix: stop cloud voice recording immediately"
```

## Chunk 2: 云端 stop 编排与本地状态

### Task 2: 让云端模式在 stop 点击时立即切本地 `stopping`

**Files:**
- Modify: `app/src/types/entry.ts`
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`

- [ ] **Step 1: 写失败测试，锁定“先切 stopping，再等待 stop 完成”**

```ts
it('marks voice entry as stopping before stopRecording resolves', async () => {
  const deferred = createDeferred<{ uri: string; size: number; duration: number; mimeType: string }>();
  const deps = makeStopDeps({
    stopRecording: jest.fn(() => deferred.promise),
    updateLocalEntry: jest.fn().mockResolvedValue(undefined),
  });

  const stopPromise = stopCloudVoiceRecordingForTest('voice-1', deps);

  await Promise.resolve();
  expect(deps.updateLocalEntry).toHaveBeenCalledWith('voice-1', { recordingStatus: 'stopping' });

  deferred.resolve({ uri: 'file:///tmp.m4a', size: 1, duration: 3, mimeType: 'audio/m4a' });
  await stopPromise;
});
```

- [ ] **Step 2: 运行测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' -t "marks voice entry as stopping before stopRecording resolves"`

Expected: FAIL，当前 `handleStopRecording` / `finalizeCloudVoiceRecordingForTest()` 会一直等 `stopRecording()` 完成后才更新 entry。

- [ ] **Step 3: 提取可测试的 stop helper，并接入主页录音链路**

```ts
export async function stopCloudVoiceRecordingForTest(entryId: string, deps: VoiceCloudStopDeps) {
  deps.clearTimer();
  await deps.updateLocalEntry(entryId, { recordingStatus: 'stopping' });

  const audioFile = await deps.stopRecording();
  const persistedUri = await deps.saveVoiceToCache(audioFile.uri, entryId);

  await deps.updateLocalEntry(entryId, {
    recordingStatus: 'completed',
    syncStatus: 'pending_upload',
    recordingDuration: Math.floor(audioFile.duration),
    media: [{ uri: persistedUri, mimeType: audioFile.mimeType, size: audioFile.size, duration: Math.floor(audioFile.duration * 1000) }],
  });
}
```

实现要求：
- `index.tsx` 里新增或重命名一个纯 helper，避免把关键 stop 顺序埋在 hook 闭包里
- `currentRecordingIdRef` 和 timer 仍在 `handleStopRecording` 里统一清理
- 本地先切 `stopping`，后续失败也不能退回 `recording`

- [ ] **Step 4: 回跑主页录音链路测试**

Run: `cd app && npx jest --run-in-band --runTestsByPath 'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts'`

Expected: PASS

- [ ] **Step 5: 提交云端 stop 编排修复**

```bash
git add app/src/types/entry.ts app/app/'(tabs)'/index.tsx app/app/'(tabs)'/__tests__/index.voice-cloud-mode.test.ts
git commit -m "fix: mark cloud voice entries stopping immediately"
```

## Chunk 3: 录音卡 UI 与防重复点击

### Task 3: 给 `EntryCard` 增加 `stopping` 展示与 stop 禁用

**Files:**
- Modify: `app/src/components/EntryCard.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 写失败测试，锁定 `stopping` 的可见行为**

```tsx
it('shows 处理中 and disables stop button when voice entry is stopping', () => {
  const entry = {
    ...recordingVoiceEntry,
    id: 'voice-stopping-1',
    recordingStatus: 'stopping',
  };

  const { getByText, getByTestId } = render(<EntryCard entry={entry} onDelete={jest.fn()} />);

  expect(getByText('处理中...')).toBeTruthy();
  expect(getByTestId('voice-stop-button-voice-stopping-1').props.disabled).toBe(true);
});
```

- [ ] **Step 2: 运行测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx -t "shows 处理中"`

Expected: FAIL，当前组件只区分 `recording` 与 `completed/uploading`，没有 `stopping` 展示。

- [ ] **Step 3: 最小实现 `stopping` UI**

```tsx
if (entry.recordingStatus === 'stopping') {
  return (
    <TouchableOpacity disabled testID={`voice-stop-button-${entry.id}`}>
      <Ionicons name="stop" ... />
    </TouchableOpacity>
    <Text>处理中...</Text>
  );
}
```

实现要求：
- `stopping` 使用与录音中接近的布局，避免列表跳动过大
- stop 按钮继续占位，但禁用点击
- 不新增新的同步状态；仍由 `recordingStatus` 驱动本地中间态

- [ ] **Step 4: 回跑 `EntryCard` 测试**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/EntryCard.test.tsx`

Expected: PASS

- [ ] **Step 5: 提交 UI 防重点击修复**

```bash
git add app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "fix: show stopping state for cloud voice cards"
```

## Chunk 4: 收口验证与文档

### Task 4: 完成验证并更新 spec / plan

**Files:**
- Modify: `docs/superpowers/specs/2026-03-22-voice-stop-immediacy-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-voice-stop-immediacy.md`

- [ ] **Step 1: 跑目标测试**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/services/__tests__/voiceService.test.ts \
  'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' \
  src/components/__tests__/EntryCard.test.tsx
```

Expected: PASS

- [ ] **Step 2: 跑类型检查**

Run: `cd app && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 3: 做手动验证**

手测要点：
- 云端模式开始录音后创建本地卡片
- 点击停止后计时立即冻结
- 卡片立即从 `录音中...` 切到 `处理中...`
- 最终保存出来的音频时长不再明显超过点击时刻
- 完成后仍进入 `待上传`

- [ ] **Step 4: 更新文档状态与验证结果**

更新 `docs/superpowers/specs/2026-03-22-voice-stop-immediacy-design.md`：
- 状态改为 `已实现`
- 记录最终实现偏差
- 补齐验证结果

更新 `docs/superpowers/plans/2026-03-22-voice-stop-immediacy.md`：
- 勾选已完成步骤
- 记录实际执行命令和结果

- [ ] **Step 5: 提交文档收口**

```bash
git add docs/superpowers/specs/2026-03-22-voice-stop-immediacy-design.md docs/superpowers/plans/2026-03-22-voice-stop-immediacy.md
git commit -m "docs: close out voice stop immediacy fix"
```

## 执行注意事项

- 不要恢复暂停/继续录音能力；当前任务只修 `stop` 的即时性
- 不要顺手重构 `voiceUploadQueue`
- 不要改变 `AudioFile` 返回结构，避免波及照片/语音之外的调用点
- `stopping` 只作为本地中间态；不要把它塞进后端同步协议
- 若实现中发现 `expo-audio` 的原生 `stop()` 本身有平台级延迟，再单开新 spec，不要在本任务里扩大为平台适配项目

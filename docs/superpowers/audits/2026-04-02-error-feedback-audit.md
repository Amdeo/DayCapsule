# 2026-04-02 Error Feedback Audit

## Classification Rule

- Show `showErrorFeedback(...)` when the user directly initiated an action, the action failed, and the user needs a visible explanation.
- Show `showConfirmDialog(...)` when the user must choose between multiple next actions.
- Keep logging-only behavior when the failure is internal, already surfaced elsewhere, or telemetry-only.

## Confirmed Already Covered

- `app/src/components/login-page/useLoginPageController.ts`
  - Missing credentials -> `showErrorFeedback(...)`
  - Password mismatch -> `showErrorFeedback(...)`
  - Auth request failure -> `buildLoginFailedFeedback(...)`
- `app/src/components/entry-editor/useEntryEditorController.ts`
  - Save failure stays in editor and shows branded `保存失败`
- `app/src/services/showCloudSyncStatusAlert.ts`
  - Manual sync failure -> `buildCloudSyncFailedFeedback(...)`
  - Refresh-after-sync failure -> `buildCloudSyncStatusRefreshFailedFeedback(...)`

## Fixed In This Branch

- `app/src/components/timeline-v2/useTimelineController.ts`
  - `handleSaveEdit(...)` now awaits `updateEntry(...)`
  - failed save keeps the editor open
  - rejected saves continue into the existing `EntryEditor` failure feedback flow, which shows branded `保存失败` feedback without duplicating prompt logic
- `app/src/components/EntryActionSheet.tsx`
  - confirm delete now awaits async `onDelete()` before closing the sheet
  - rejected deletes keep the confirm state open so caller-level feedback and retry remain possible
- `app/src/components/Timeline.v2.tsx`
  - timeline/home delete calls now wrap `deleteEntry(...)` at the user-facing caller
  - rejected deletes show branded `删除失败` feedback without pushing UI concerns into `entryStore`
  - calendar-mode delete reuses the same wrapped handler, verified through `Timeline.v2.view-mode.test.tsx`
- `app/src/components/entry-card/useEntryCardController.ts`
  - stopping an in-progress recording now surfaces branded `停止失败` feedback when `onStopRecording(...)` rejects
  - the card keeps its retryable state by resetting processing after the existing debounce window
- `app/src/components/entry-card/useEntryCardAudio.ts`
  - stopping voice playback now surfaces branded `停止失败` feedback when `VoiceService.stopPlayback()` rejects
  - the card still resets local playback UI afterward, but the user no longer loses the failure silently
- `app/src/components/voice-recorder/useVoiceRecorderController.ts`
  - active-session pause failures now surface branded `暂停失败` feedback without mutating the recorder into a paused state
  - active-session resume failures now surface branded `继续失败` feedback while keeping the recorder in the paused state
  - active-session cancel failures now surface branded `取消失败` feedback while the recorder still completes its close flow
- `app/src/store/commonTagsStore.ts`
  - optimistic preset-tag updates no longer fail silently when persistence to storage rejects
  - add/remove/reset/reorder paths now surface branded save-failed feedback that matches the user-visible action already applied in memory
  - loading persisted preset tags no longer fails silently when storage access rejects
  - failed loads now surface branded `加载失败` feedback while safely falling back to the default preset tags
- `app/src/store/entryStore.ts`
  - `restoreEntries()` no longer turns a successful restore into a full failure when only the follow-up `loadEntries()` refresh rejects
  - refresh-after-restore failures are now downgraded to logging so caller-level import flows can keep reporting the actual restore result
- `app/src/components/search-overlay/useSearchOverlayController.ts`
  - search submission no longer fails silently when `applySearchFilters()` rejects
  - failed search submissions now surface branded `搜索失败` feedback and keep the overlay open for retry
  - opening the overlay no longer fails silently when `getAllTags()` rejects during initial tag loading
  - failed tag loads now surface branded `加载失败` feedback and safely fall back to an empty tag list
- `app/src/components/FilterBar.tsx`
  - opening the filter bar no longer fails silently when `getAllTags()` rejects during initial filter-tag loading
  - failed filter-tag loads now surface branded `加载失败` feedback and safely fall back to an empty tag list
- `app/src/components/timeline-v2/useTimelineFilters.ts`
  - timeline active-filter clear actions no longer fail silently when the follow-up `applyFilters()` refresh rejects
  - clear-query/type/date/tag/all actions now surface branded `筛选失败` feedback when the result refresh cannot complete
- `app/app/(tabs)/index.tsx`
  - home-screen initialization no longer fails silently when the initial `loadEntries()` step rejects during the startup `Promise.all(...)`
  - failed entry loading during home bootstrap now surfaces branded `加载失败` feedback instead of leaving the first screen quietly empty
  - non-cloud quick-add voice starts no longer fail silently for generic recording-start errors after special cases like active-recording and permission-denied are excluded
  - failed local recording starts now surface branded `录音失败` feedback from the home quick-add entry point
  - non-cloud recording finalization now shares the same branded `录音保存失败` feedback path as cloud-mode recording saves when stop/save steps fail
- `app/src/components/text-editor/useTextEditorController.ts`
  - async text-editor saves no longer fail silently when `onSave()` rejects
  - failed text saves now surface branded `保存失败` feedback and keep the draft content intact for retry, including the home quick-add text flow
- `app/src/components/Timeline.v2.tsx`
  - explicit home-timeline load-more triggers no longer fail silently when the paginated `loadMore()` call throws
  - load-more failures now surface branded `加载失败` feedback while keeping pagination state management in the store
- `app/src/store/settingsStore.ts`
  - `loadSettings()` no longer fails silently when scoped storage reads reject during bootstrap
  - failed settings loads now surface branded `加载失败` feedback while the store safely falls back to default settings
- `app/src/components/settings-page/useSettingsPageController.ts`
  - reset-settings confirmation no longer relies on `ConfirmDialogHost` logging when `resetSettings()` rejects
  - confirmed reset failures now surface branded `重置失败` feedback while keeping the success path unchanged
  - direct display-setting saves (`highQualityPhotos`, `cardSpacing`, `photoHeight`, `calendarDensity`) now surface branded `保存失败` feedback instead of bubbling rejections without user-visible results
- `app/src/components/settings-page/useSettingsPageCloudMode.ts`
  - enabling cloud mode now surfaces branded `同步未完成` feedback when the follow-up `syncNow()` refresh rejects after cloud mode has already been enabled
  - the main cloud-mode toggle still succeeds, but the user now gets a visible result explaining that first sync needs a retry later
- `app/src/components/fab-menu/useFABMenuController.ts`
  - remembered camera launches now surface branded `拍照失败` feedback when `PhotoService.takePhoto()` rejects with a real error
  - remembered photo-library launches now surface branded `选取失败` feedback when `PhotoService.pickPhotoFromLibrary()` rejects with a real error
  - explicit user-cancel paths remain silent
  - long-press fan-menu camera/photo selections reuse the same guarded failure path, verified through `FABMenu.peek-hide.test.tsx`
- `app/src/components/settings-page/useSettingsPageStorage.ts`
  - clearing cache no longer reports a misleading success result when local data is cleared but `loadEntries()` fails afterward
  - the user now sees branded `同步未完成` feedback explaining that local data was cleared but the list refresh needs a retry later
- `app/src/components/image-viewer/useImageViewerActions.ts`
  - share actions no longer treat every thrown error as a user-cancel path
  - real share failures now surface branded `分享失败` feedback while explicit cancel paths remain silent

## Deferred / Log Only

- `app/src/components/voice-recorder/useVoiceRecorderController.ts`
  - the external `visible -> false` cleanup path still logs `Failed to cancel recording on modal close` without app feedback
  - this is currently treated as internal teardown rather than a user-facing in-modal action, because the recorder has already been dismissed by its parent when the cleanup runs
  - keep under observation if product expectations change toward surfacing teardown failures after forced dismissals

## Next Candidates

- `app/src/components/timeline-v2/...`
  - verify no other user-triggered mutations close UI optimistically without failure feedback
- `app/src/components/backup-page/useBackupPageController.ts`
  - already heavily covered; keep as reference for branded result/error handling patterns

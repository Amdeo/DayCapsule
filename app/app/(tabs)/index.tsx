import { View, Linking, BackHandler, Pressable, Dimensions } from 'react-native';
import { memo, useState, useEffect, useCallback, useRef, type ComponentProps } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useEntryStore } from '@/src/store/entryStore';
import { Timeline } from '@/src/components/Timeline.v2';
import { Sidebar } from '@/src/components/Sidebar';
import { TextEditor } from '@/src/components/TextEditor';
import { VoiceService } from '@/src/services/voiceService';
import { PhotoService, PhotoResult } from '@/src/services/photoService';
import { buildPhotoLogPayload, fingerprintPhotoFile } from '@/src/services/photoIntegrityService';
import { logger } from '@/src/utils/logger';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import type { Entry } from '@/src/types/entry';
import { deleteFile } from '@/src/utils/fileSystem';
import {
  enqueueVoiceUpload,
  configureVoiceUploadQueueCallbacks,
  flushPendingVoiceUploads,
} from '@/src/services/voiceUploadQueue';
import {
  enqueuePhotoUpload,
  configurePhotoUploadQueueCallbacks,
} from '@/src/services/photoUploadQueue';
import {
  preparePhotoEntryMedia as preparePhotoEntryMediaService,
  type PhotoEntryPreparationError,
} from '@/src/services/photoEntryPreparationService';
import {
  prepareVoiceEntryMedia as prepareVoiceEntryMediaService,
  type VoiceEntryPreparationError,
} from '@/src/services/voiceEntryPreparationService';
import { createHomeUploadSyncOrchestration } from '@/src/services/homeUploadSyncOrchestration';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

const { width: SCREEN_WIDTH } = Dimensions.get('screen');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
const MAIN_TRANSLATE_X = SIDEBAR_WIDTH;
const RECORDING_DURATION_POLL_MS = 250;
const HOME_SCREEN_ROOT_FLEX = 1;

const HOME_SCREEN_ROOT_STYLE = {
  flex: HOME_SCREEN_ROOT_FLEX,
};

const DRAWER_OVERLAY_STYLE = {
  left: MAIN_TRANSLATE_X,
};

const StableTimeline = memo(Timeline);

type SidebarShellProps = Pick<ComponentProps<typeof Sidebar>, 'drawerProgress' | 'onClose'>;

function SidebarShell({ drawerProgress, onClose }: SidebarShellProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  return (
    <Sidebar
      drawerProgress={drawerProgress}
      onClose={onClose}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      showStats={showStats}
      setShowStats={setShowStats}
      showBackup={showBackup}
      setShowBackup={setShowBackup}
    />
  );
}

const StableSidebarShell = memo(SidebarShell);

export interface PhotoSelectDeps {
  addLocalEntry: (
    entry: Omit<import('@/src/types/entry').Entry, 'id' | 'timestamp'>
  ) => Promise<import('@/src/types/entry').Entry>;
  updateLocalEntry: (entryId: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  preparePhotoEntryMedia: (
    results: import('@/src/services/photoService').PhotoResult[]
  ) => Promise<import('@/src/services/photoEntryPreparationService').PreparedPhotoEntryMedia>;
  deleteLocalFile?: (uri: string) => Promise<void>;
  enqueueUpload?: (entryId: string) => void;
  initialSyncStatus?: import('@/src/types/entry').Entry['syncStatus'];
}

export interface VoiceCloudStartDeps {
  now?: () => number;
  startRecording: () => Promise<unknown>;
  createLocalEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<Entry>;
}

export interface VoiceCloudFinalizeDeps {
  stopRecording: () => Promise<{ uri: string; size: number; duration: number; mimeType: string }>;
  prepareVoiceEntryMedia: (
    entryId: string,
    audioFile: { uri: string; size: number; duration: number; mimeType: string }
  ) => Promise<import('@/src/services/voiceEntryPreparationService').PreparedVoiceEntryMedia>;
  updateLocalEntry: (entryId: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  deleteLocalFile: (uri: string) => Promise<void>;
  enqueueUpload: (entryId: string) => void;
  preloadAudio: (uri: string) => Promise<void>;
}

export function clearRecordingTimerForTest(
  timerRef: { current: ReturnType<typeof setInterval> | null }
): void {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

export function assertCanStartVoiceRecordingForTest(currentRecordingId: string | null): void {
  if (!currentRecordingId) return;
  const error = new Error('ACTIVE_RECORDING_IN_PROGRESS') as Error & { code?: string };
  error.code = 'ACTIVE_RECORDING_IN_PROGRESS';
  throw error;
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

export function readErrorCodeForTest(error: unknown): string | undefined {
  return getErrorCode(error);
}

export async function handleVoiceRecordingStartErrorForTest(
  error: unknown,
  createdEntryId: string | null,
  deleteEntry: (entryId: string) => Promise<void>
): Promise<boolean> {
  const errorCode = getErrorCode(error);

  if (errorCode === 'ACTIVE_RECORDING_IN_PROGRESS') {
    showErrorFeedback({
      title: '录音进行中',
      message: '请先完成当前录音，再开始新的录音。',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    return true;
  }

  if (createdEntryId) {
    try {
      await deleteEntry(createdEntryId);
    } catch (e) {
      logger.error('[HomeScreen] Failed to clean up failed recording entry:', e);
    }
  }

  if (errorCode === 'PERMISSION_DENIED') {
    showConfirmDialog({
      title: '需要麦克风权限',
      message: '请在系统设置中允许 DayCapsule 访问麦克风，才能录制语音。',
      actions: [
        { label: '取消', role: 'secondary' },
        {
          label: '去设置',
          role: 'primary',
          onPress: () => Linking.openURL('app-settings:'),
        },
      ],
    });
    return true;
  }

  return false;
}

function toDisplayedRecordingDuration(duration: number): number {
  return Math.max(0, Math.floor(duration));
}

function createRecordingDurationPoller({
  entryId,
  getRecordingDuration,
  updateRecordingDuration,
}: {
  entryId: string;
  getRecordingDuration: () => Promise<number>;
  updateRecordingDuration: (entryId: string, duration: number) => void;
}): () => Promise<void> {
  let lastDisplayedDuration = -1;

  return async () => {
    const duration = await getRecordingDuration();
    const displayedDuration = toDisplayedRecordingDuration(duration);
    if (displayedDuration !== lastDisplayedDuration) {
      lastDisplayedDuration = displayedDuration;
      updateRecordingDuration(entryId, displayedDuration);
    }
  };
}

function buildTemporaryVoiceEntry(now: number): Entry {
  return {
    id: String(now),
    type: 'voice',
    content: '',
    timestamp: now,
    syncStatus: 'pending_upload',
    localReadyState: 'processing',
    recordingStatus: 'recording',
    recordingDuration: 0,
    media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
  };
}

export async function startCloudVoiceRecordingForTest(deps: VoiceCloudStartDeps): Promise<Entry> {
  await deps.startRecording();
  const now = deps.now?.() ?? Date.now();
  const entry = buildTemporaryVoiceEntry(now);
  return deps.createLocalEntry({
    type: entry.type,
    content: entry.content,
    syncStatus: entry.syncStatus,
    localReadyState: entry.localReadyState,
    recordingStatus: entry.recordingStatus,
    recordingDuration: entry.recordingDuration,
    media: entry.media,
  });
}

export async function finalizeCloudVoiceRecordingForTest(
  entryId: string,
  deps: VoiceCloudFinalizeDeps
): Promise<void> {
  await deps.updateLocalEntry(entryId, {
    recordingStatus: 'stopping',
  });

  let audioFile: Awaited<ReturnType<typeof deps.stopRecording>>;
  try {
    audioFile = await deps.stopRecording();
  } catch (error) {
    await deps.deleteEntry(entryId).catch(() => {});
    throw error;
  }

  let preparedCreatedFiles: string[] = [];
  let preparedMedia: import('@/src/types/entry').MediaInfo[] = [];
  try {
    const prepared = await deps.prepareVoiceEntryMedia(entryId, audioFile);
    preparedCreatedFiles = prepared.createdFiles;
    preparedMedia = prepared.media;
  } catch (error) {
    const createdFiles = (error as VoiceEntryPreparationError).createdFiles ?? [];
    await Promise.all(createdFiles.map((uri) => deps.deleteLocalFile(uri)));
    await deps.deleteEntry(entryId).catch(() => {});
    throw error;
  }

  try {
    await deps.updateLocalEntry(entryId, {
      recordingStatus: 'completed',
      localReadyState: 'ready',
      syncStatus: 'pending_upload',
      recordingDuration: Math.floor(audioFile.duration),
      media: preparedMedia,
    });
  } catch (error) {
    await Promise.all(preparedCreatedFiles.map((uri) => deps.deleteLocalFile(uri)));
    await deps.deleteEntry(entryId).catch(() => {});
    throw error;
  }

  deps.preloadAudio(preparedMedia[0]?.uri ?? '').catch((err) => {
    logger.warn('[HomeScreen] Failed to preload audio:', err);
  });

  try {
    deps.enqueueUpload(entryId);
  } catch (error) {
    logger.warn('[HomeScreen] Failed to enqueue voice upload:', error);
  }
}

export async function handlePhotoSelectForTest(
  results: import('@/src/services/photoService').PhotoResult[],
  deps: PhotoSelectDeps
): Promise<void> {
  const previewMedia = results.map((result) => ({
    uri: result.uri,
    mimeType: 'image/jpeg' as const,
    size: 0,
    metadata: {
      width: result.width,
      height: result.height,
      aspectRatio: result.aspectRatio,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    },
  }));

  const createdEntry = await deps.addLocalEntry({
    type: 'photo',
    content: '',
    syncStatus: deps.initialSyncStatus ?? 'pending_upload',
    localReadyState: 'processing',
    media: previewMedia,
  });

  let preparedCreatedFiles: string[] = [];
  try {
    const prepared = await deps.preparePhotoEntryMedia(results);
    preparedCreatedFiles = prepared.createdFiles;
    await deps.updateLocalEntry(createdEntry.id, {
      media: prepared.media,
      localReadyState: 'ready',
    });
    prepared.media.forEach((media) => {
      logger.log('photo.db.entry_saved', buildPhotoLogPayload({
        entryId: createdEntry.id,
        localMediaId: media.metadata?.localMediaId,
        localUri: media.uri,
        mimeType: media.mimeType,
        size: media.size,
        width: media.metadata?.width,
        height: media.metadata?.height,
        sourceHash: media.metadata?.sourceHash,
        persistedHash: media.metadata?.persistedHash,
        integrityStatus: media.metadata?.integrityStatus,
        integrityReason: media.metadata?.integrityReason ?? null,
      }));
    });

    try {
      deps.enqueueUpload?.(createdEntry.id);
    } catch (error) {
      logger.warn('[HomeScreen] Failed to enqueue photo upload:', error);
    }
  } catch (error) {
    const createdFiles = preparedCreatedFiles.length > 0
      ? preparedCreatedFiles
      : (error as PhotoEntryPreparationError).createdFiles ?? [];
    if (deps.deleteLocalFile) {
      const deleteLocalFile = deps.deleteLocalFile;
      await Promise.all(
        createdFiles.map((uri) => deleteLocalFile(uri).catch(() => undefined))
      );
    }
    await deps.deleteEntry(createdEntry.id).catch((deleteError) => {
      logger.error('[HomeScreen] Failed to clean up failed photo entry:', deleteError);
    });
    throw error;
  }
}

export default function HomeScreen() {
  const {
    loadEntries, addEntry, addLocalEntry, updateLocalEntry, deleteEntry,
    updateRecordingStatus, updateRecordingDuration, completeRecording,
  } = useEntryStore();

  const [showTextEditor, setShowTextEditor] = useState(false);
  const drawerProgress = useSharedValue(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const uploadSyncOrchestration = useRef(createHomeUploadSyncOrchestration());

  // 使用 ref 存储计时器和录音 ID，避免触发不必要的重渲染
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRecordingIdRef = useRef<string | null>(null);
  const refreshCloudSyncIndicator = useCallback(() => {
    void useCloudSyncIndicatorStore.getState().refresh().catch((error) => {
      logger.warn('[HomeScreen] Failed to refresh cloud sync indicator:', error);
    });
  }, []);

  const isCloudModeEnabled = useCallback(
    () => useSettingsStore.getState().cloudMode === true,
    []
  );

  // 初始化：加载设置 + 数据 + 预热音频
  useEffect(() => {
    // 并行加载设置和条目数据
    Promise.all([
      useSettingsStore.getState().loadSettings(),
      useCommonTagsStore.getState().loadCommonTags(),
      loadEntries(),
    ]).catch(() => {})
      .finally(() => {
        refreshCloudSyncIndicator();
      });

    VoiceService.prewarmAudioSystem().catch(() => {});

    const preloadRecentVoiceEntries = async () => {
      try {
        const entries = useEntryStore.getState().entries;
        const voiceEntries = entries
          .filter((e) => e.type === 'voice' && e.media?.[0]?.uri)
          .slice(0, 3);

        for (const entry of voiceEntries) {
          await VoiceService.preloadAudio(entry.media![0].uri).catch((err) => {
            logger.warn('[HomeScreen] Failed to preload audio:', entry.id, err);
          });
        }
      } catch (error) {
        logger.error('[HomeScreen] Failed to preload voice entries:', error);
      }
    };

    preloadRecentVoiceEntries();
  }, [loadEntries, refreshCloudSyncIndicator]);

  useEffect(() => {
    const orchestration = uploadSyncOrchestration.current;
    configureVoiceUploadQueueCallbacks(orchestration.voiceCallbacks);
    configurePhotoUploadQueueCallbacks(orchestration.photoCallbacks);
  }, []);

  // 卸载时清理录音
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (currentRecordingIdRef.current) {
        VoiceService.cancelRecording().catch((err) => logger.error(err));
      }
    };
  }, []);

  const startRecordingTimer = useCallback((entryId: string) => {
    const pollRecordingDuration = createRecordingDurationPoller({
      entryId,
      getRecordingDuration: VoiceService.getRecordingDuration.bind(VoiceService),
      updateRecordingDuration,
    });
    recordingTimerRef.current = setInterval(() => {
      void pollRecordingDuration();
    }, RECORDING_DURATION_POLL_MS);
  }, [updateRecordingDuration]);

  const handleMediaSelect = useCallback(async (type: 'text' | 'photo' | 'voice', photos?: PhotoResult[]) => {
    switch (type) {
      case 'text':
        setShowTextEditor(true);
        break;

      case 'photo':
        if (photos && photos.length > 0) {
          await handlePhotoSelectArr(photos);
        }
        break;

      case 'voice':
        let createdEntryId: string | null = null;
        try {
          assertCanStartVoiceRecordingForTest(currentRecordingIdRef.current);
          if (isCloudModeEnabled()) {
            const tempEntry = await startCloudVoiceRecordingForTest({
              startRecording: VoiceService.startRecording.bind(VoiceService),
              createLocalEntry: addLocalEntry,
            });
            createdEntryId = tempEntry.id;
            currentRecordingIdRef.current = tempEntry.id;
            startRecordingTimer(tempEntry.id);
          } else {
            await addEntry({
              type: 'voice',
              content: '',
              syncStatus: 'pending',
              recordingStatus: 'recording',
              recordingDuration: 0,
              media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
            });

            const entries = useEntryStore.getState().entries;
            const newEntry = entries[0];

            if (newEntry) {
              createdEntryId = newEntry.id;
              currentRecordingIdRef.current = newEntry.id;
              await VoiceService.startRecording();
              startRecordingTimer(newEntry.id);
            }
          }
        } catch (error) {
          const handled = await handleVoiceRecordingStartErrorForTest(error, createdEntryId, deleteEntry);

          if (handled) {
            if (createdEntryId && currentRecordingIdRef.current === createdEntryId) {
              currentRecordingIdRef.current = null;
            }
            return;
          }

          logger.error('[HomeScreen] Failed to start recording:', error);
          if (createdEntryId && currentRecordingIdRef.current === createdEntryId) {
            currentRecordingIdRef.current = null;
          }
        }
        break;
    }
  }, [addEntry, addLocalEntry, deleteEntry, isCloudModeEnabled, startRecordingTimer]);

  const handleStopRecording = useCallback(async (id: string) => {
    clearRecordingTimerForTest(recordingTimerRef);
    try {
      if (isCloudModeEnabled()) {
        const shouldEnqueueUpload = uploadSyncOrchestration.current.shouldEnqueueVoiceUpload(
          isCloudModeEnabled()
        );
        await finalizeCloudVoiceRecordingForTest(id, {
          stopRecording: VoiceService.stopRecording.bind(VoiceService),
          prepareVoiceEntryMedia: (entryId, audioFile) => prepareVoiceEntryMediaService(entryId, audioFile, {
            saveVoiceToCache: (sourceUri, currentEntryId) => VoiceService.saveVoiceToCache(sourceUri, currentEntryId),
          }),
          updateLocalEntry,
          deleteEntry,
          deleteLocalFile: deleteFile,
          enqueueUpload: shouldEnqueueUpload ? enqueueVoiceUpload : () => {},
          preloadAudio: VoiceService.preloadAudio.bind(VoiceService),
        });
      } else {
        const audioFile = await VoiceService.stopRecording();
        const persistentUri = await VoiceService.saveVoiceToStorage(audioFile.uri, id);
        await completeRecording(id, persistentUri, audioFile.duration * 1000);

        VoiceService.preloadAudio(persistentUri).catch((err) => {
          logger.warn('[HomeScreen] Failed to preload audio:', err);
        });
      }
    } catch (error) {
      logger.error('[HomeScreen] Failed to stop recording:', error);
      if (isCloudModeEnabled()) {
        showErrorFeedback({
          title: '录音保存失败',
          message: '录音文件保存失败，请重试。',
          actions: [{ label: '知道了', role: 'primary' }],
        });
      }
    } finally {
      currentRecordingIdRef.current = null;
    }
  }, [completeRecording, deleteEntry, isCloudModeEnabled, updateLocalEntry]);

  const handleTextSave = useCallback(async (content: string, tags: string[]) => {
    try {
      await addEntry({ type: 'text', content, tags, syncStatus: 'pending' });
      setShowTextEditor(false);
    } catch (error) {
      logger.error('[HomeScreen] Failed to save text entry:', error);
    }
  }, [addEntry]);

  const handlePhotoSelectArr = useCallback(async (results: PhotoResult[]) => {
    try {
      const photoCreationPolicy = uploadSyncOrchestration.current.getPhotoCreationPolicy(
        isCloudModeEnabled()
      );
      await handlePhotoSelectForTest(results, {
        addLocalEntry,
        updateLocalEntry,
        deleteEntry,
        preparePhotoEntryMedia: (photoResults) => preparePhotoEntryMediaService(photoResults, {
          savePhoto: isCloudModeEnabled()
            ? PhotoService.savePhotoToCache.bind(PhotoService)
            : PhotoService.savePhotoToStorage.bind(PhotoService),
          fingerprintPhotoFile,
          deleteLocalFile: deleteFile,
        }),
        deleteLocalFile: deleteFile,
        enqueueUpload: photoCreationPolicy.shouldEnqueueUpload ? enqueuePhotoUpload : undefined,
        initialSyncStatus: photoCreationPolicy.initialSyncStatus,
      });
    } catch (error) {
      logger.error('[HomeScreen] Failed to save photo entry:', error);
      showErrorFeedback({
        title: '保存失败',
        message: '照片保存失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  }, [addLocalEntry, deleteEntry, isCloudModeEnabled, updateLocalEntry]); // eslint-disable-line react-hooks/exhaustive-deps -- handlePhotoSelectForTest is a stable module-level function

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    cancelAnimation(drawerProgress);
    drawerProgress.value = withTiming(1, { duration: 280 });
  }, [drawerProgress]);

  const closeDrawer = useCallback(() => {
    cancelAnimation(drawerProgress);
    drawerProgress.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(setDrawerOpen)(false);
    });
  }, [drawerProgress]);

  useEffect(() => {
    if (!drawerOpen) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDrawer();
      return true;
    });

    return () => sub.remove();
  }, [drawerOpen, closeDrawer]);

  const mainContentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drawerProgress.value, [0, 1], [0, MAIN_TRANSLATE_X]) },
    ],
  }));

  return (
    <View
      testID="home-screen-root"
      className="flex-1 bg-home-mask"
      style={HOME_SCREEN_ROOT_STYLE}
    >
      <Animated.View className="flex-1" style={mainContentStyle}>
        <StableTimeline
          onQuickAdd={handleMediaSelect}
          onMenuPress={openDrawer}
          onStopRecording={handleStopRecording}
        />
      </Animated.View>

      <TextEditor
        visible={showTextEditor}
        onSave={handleTextSave}
        onCancel={() => setShowTextEditor(false)}
      />

      <StableSidebarShell
        drawerProgress={drawerProgress}
        onClose={closeDrawer}
      />

      {drawerOpen && (
        <Pressable
          onPress={closeDrawer}
          className="absolute bottom-0 right-0 top-0 z-[5]"
          style={DRAWER_OVERLAY_STYLE}
        />
      )}
    </View>
  );
}

import { View, Alert, Linking, BackHandler, Pressable, Dimensions } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('screen');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
const MAIN_TRANSLATE_X = SIDEBAR_WIDTH;
const RECORDING_DURATION_POLL_MS = 250;

export interface PhotoSelectDeps {
  savePhotoToStorage: (
    sourceUri: string,
    fileId: string,
    quality: 'low' | 'medium' | 'high',
    aspectRatio?: number
  ) => Promise<import('@/src/services/photoService').SavedPhotoResult>;
  deleteLocalFile?: (uri: string) => Promise<void>;
  addLocalEntry: (
    entry: Omit<import('@/src/types/entry').Entry, 'id' | 'timestamp'>
  ) => Promise<import('@/src/types/entry').Entry>;
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
  saveVoiceToCache: (sourceUri: string, entryId: string) => Promise<string>;
  updateLocalEntry: (entryId: string, updates: Partial<Entry>) => Promise<void>;
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

export function toDisplayedRecordingDurationForTest(duration: number): number {
  return Math.max(0, Math.floor(duration));
}

function buildTemporaryVoiceEntry(now: number): Entry {
  return {
    id: String(now),
    type: 'voice',
    content: '',
    timestamp: now,
    syncStatus: 'pending_upload',
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
    await deps.updateLocalEntry(entryId, { recordingStatus: 'recording' });
    throw error;
  }

  let persistedUri: string;
  try {
    persistedUri = await deps.saveVoiceToCache(audioFile.uri, entryId);
  } catch (error) {
    await deps.updateLocalEntry(entryId, { recordingStatus: 'recording' });
    throw error;
  }

  await deps.updateLocalEntry(entryId, {
    recordingStatus: 'completed',
    syncStatus: 'pending_upload',
    recordingDuration: Math.floor(audioFile.duration),
    media: [{
      uri: persistedUri,
      mimeType: audioFile.mimeType,
      size: audioFile.size,
      duration: Math.floor(audioFile.duration * 1000),
    }],
  });

  deps.preloadAudio(persistedUri).catch((err) => {
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
  const mediaList: import('@/src/types/entry').MediaInfo[] = [];
  const savedFiles: string[] = [];
  for (const result of results) {
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const savedPhoto = await deps.savePhotoToStorage(
      result.uri,
      fileId,
      'medium',
      result.aspectRatio
    );

    mediaList.push({
      uri: savedPhoto.originalUri,
      mimeType: 'image/jpeg',
      size: 0,
      thumbnail: savedPhoto.thumbnailUri,
      metadata: {
        width: savedPhoto.width,
        height: savedPhoto.height,
        aspectRatio: savedPhoto.aspectRatio,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
    });
    savedFiles.push(savedPhoto.originalUri, savedPhoto.thumbnailUri);
  }

  try {
    const createdEntry = await deps.addLocalEntry({
      type: 'photo',
      content: '',
      syncStatus: deps.initialSyncStatus ?? 'pending_upload',
      media: mediaList,
    });

    try {
      deps.enqueueUpload?.(createdEntry.id);
    } catch (error) {
      logger.warn('[HomeScreen] Failed to enqueue photo upload:', error);
    }
  } catch (error) {
    if (deps.deleteLocalFile) {
      await Promise.all(savedFiles.map((uri) => deps.deleteLocalFile?.(uri)));
    }
    throw error;
  }
}

export default function HomeScreen() {
  const {
    loadEntries, addEntry, addLocalEntry, updateLocalEntry, replaceEntry, deleteEntry,
    updateRecordingStatus, updateRecordingDuration, completeRecording,
  } = useEntryStore();

  const [showTextEditor, setShowTextEditor] = useState(false);
  const drawerProgress = useSharedValue(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
    configureVoiceUploadQueueCallbacks({
      onEntryUploading: (id) => {
        useEntryStore.setState((s) => ({
          entries: s.entries.map((entry) => (
            entry.id === id ? { ...entry, syncStatus: 'uploading' } : entry
          )),
        }));
        refreshCloudSyncIndicator();
      },
      onEntryPending: (id) => {
        useEntryStore.setState((s) => ({
          entries: s.entries.map((entry) => (
            entry.id === id ? { ...entry, syncStatus: 'pending_upload' } : entry
          )),
        }));
        refreshCloudSyncIndicator();
      },
      onEntrySynced: (localId, entry) => {
        replaceEntry(localId, entry);
        refreshCloudSyncIndicator();
      },
    });
    configurePhotoUploadQueueCallbacks({
      onEntryUploading: (id) => {
        useEntryStore.setState((s) => ({
          entries: s.entries.map((entry) => (
            entry.id === id ? { ...entry, syncStatus: 'uploading' } : entry
          )),
        }));
        refreshCloudSyncIndicator();
      },
      onEntryPendingUpload: (id) => {
        useEntryStore.setState((s) => ({
          entries: s.entries.map((entry) => (
            entry.id === id ? { ...entry, syncStatus: 'pending_upload' } : entry
          )),
        }));
        refreshCloudSyncIndicator();
      },
      onEntryPendingSync: (id, media) => {
        useEntryStore.setState((s) => ({
          entries: s.entries.map((entry) => (
            entry.id === id ? { ...entry, syncStatus: 'pending', media } : entry
          )),
        }));
        refreshCloudSyncIndicator();
      },
    });
  }, [refreshCloudSyncIndicator, replaceEntry]);

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
    let lastDisplayedDuration = -1;
    recordingTimerRef.current = setInterval(async () => {
      const duration = await VoiceService.getRecordingDuration();
      const displayedDuration = toDisplayedRecordingDurationForTest(duration);
      if (displayedDuration !== lastDisplayedDuration) {
        lastDisplayedDuration = displayedDuration;
        updateRecordingDuration(entryId, displayedDuration);
      }
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
          if ((error as any)?.code === 'ACTIVE_RECORDING_IN_PROGRESS') {
            Alert.alert('录音进行中', '请先完成当前录音，再开始新的录音。');
            return;
          }

          logger.error('[HomeScreen] Failed to start recording:', error);
          // startRecording 失败时只清理本次尝试创建的 entry，避免误删已有录音
          if (createdEntryId) {
            try {
              if (isCloudModeEnabled()) {
                await deleteEntry(createdEntryId);
              } else {
                await deleteEntry(createdEntryId);
              }
            } catch (e) {
              logger.error('[HomeScreen] Failed to clean up failed recording entry:', e);
            }
          }
          if (createdEntryId && currentRecordingIdRef.current === createdEntryId) {
            currentRecordingIdRef.current = null;
          }
          // 权限被拒绝时引导用户去设置
          if ((error as any)?.code === 'PERMISSION_DENIED') {
            Alert.alert(
              '需要麦克风权限',
              '请在系统设置中允许 MemoryCapsule 访问麦克风，才能录制语音。',
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '去设置',
                  onPress: () => Linking.openURL('app-settings:'),
                },
              ]
            );
          }
        }
        break;
    }
  }, [addEntry, addLocalEntry, deleteEntry, isCloudModeEnabled, startRecordingTimer]);

  const handleStopRecording = useCallback(async (id: string) => {
    clearRecordingTimerForTest(recordingTimerRef);
    try {
      if (isCloudModeEnabled()) {
        await finalizeCloudVoiceRecordingForTest(id, {
          stopRecording: VoiceService.stopRecording.bind(VoiceService),
          saveVoiceToCache: (sourceUri, entryId) => VoiceService.saveVoiceToCache(sourceUri, entryId),
          updateLocalEntry,
          enqueueUpload: enqueueVoiceUpload,
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
        Alert.alert('录音保存失败', '录音文件保存失败，请重试。');
      }
    } finally {
      currentRecordingIdRef.current = null;
    }
  }, [completeRecording, isCloudModeEnabled, updateLocalEntry]);

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
      await handlePhotoSelectForTest(results, {
        savePhotoToStorage: isCloudModeEnabled()
          ? PhotoService.savePhotoToCache.bind(PhotoService)
          : PhotoService.savePhotoToStorage.bind(PhotoService),
        deleteLocalFile: deleteFile,
        addLocalEntry,
        enqueueUpload: isCloudModeEnabled() ? enqueuePhotoUpload : undefined,
        initialSyncStatus: isCloudModeEnabled() ? 'pending_upload' : 'synced',
      });
    } catch (error) {
      logger.error('[HomeScreen] Failed to save photo entry:', error);
      Alert.alert('保存失败', '照片保存失败，请重试');
    }
  }, [addLocalEntry, isCloudModeEnabled]); // eslint-disable-line react-hooks/exhaustive-deps -- handlePhotoSelectForTest is a stable module-level function

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
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <Animated.View style={[{ flex: 1 }, mainContentStyle]}>
        <Timeline
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

      <Sidebar
        drawerProgress={drawerProgress}
        onClose={closeDrawer}
        showSettings={showSettings} setShowSettings={setShowSettings}
        showAbout={showAbout} setShowAbout={setShowAbout}
        showStats={showStats} setShowStats={setShowStats}
        showTags={showTags} setShowTags={setShowTags}
        showBackup={showBackup} setShowBackup={setShowBackup}
        showHelp={showHelp} setShowHelp={setShowHelp}
      />

      {drawerOpen && (
        <Pressable
          onPress={closeDrawer}
          style={{
            position: 'absolute',
            left: MAIN_TRANSLATE_X,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 5,
          }}
        />
      )}
    </View>
  );
}

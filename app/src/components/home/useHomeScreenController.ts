/**
 * 首页主控制器 Hook
 * 管理数据加载、上传队列配置、录音生命周期、媒体创建流程
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { useAuthStore } from '@/src/store/authStore';
import { VoiceService } from '@/src/services/voiceService';
import { PhotoService } from '@/src/services/photoService';
import type { PhotoResult } from '@/src/services/photoService';
import { fingerprintPhotoFile } from '@/src/services/photoIntegrityService';
import { logger } from '@/src/utils/logger';
import { deleteFile } from '@/src/utils/fileSystem';
import {
  enqueueVoiceUpload,
  configureVoiceUploadQueueCallbacks,
} from '@/src/services/voiceUploadQueue';
import {
  enqueuePhotoUpload,
  configurePhotoUploadQueueCallbacks,
} from '@/src/services/photoUploadQueue';
import { preparePhotoEntryMedia as preparePhotoEntryMediaService } from '@/src/services/photoEntryPreparationService';
import { prepareVoiceEntryMedia as prepareVoiceEntryMediaService } from '@/src/services/voiceEntryPreparationService';
import { createHomeUploadSyncOrchestration } from '@/src/services/homeUploadSyncOrchestration';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import {
  clearRecordingTimerForTest,
  assertCanStartVoiceRecordingForTest,
  handleVoiceRecordingStartErrorForTest,
  createRecordingDurationPoller,
  startCloudVoiceRecordingForTest,
  finalizeCloudVoiceRecordingForTest,
} from '@/src/services/homeVoiceFlow';
import { handlePhotoSelectForTest } from '@/src/services/homePhotoFlow';
import { usePendingActionStore } from '@/src/store/pendingActionStore';
import { buildWorkspaceSessionSnapshot } from '@/src/services/workspaceSessionState';

const RECORDING_DURATION_POLL_MS = 250;

export function useHomeScreenController() {
  const {
    loadEntries, addEntry, addLocalEntry, updateLocalEntry, deleteEntry,
    updateRecordingDuration, completeRecording,
  } = useEntryStore();

  const [showTextEditor, setShowTextEditor] = useState(false);
  const uploadSyncOrchestration = useRef(createHomeUploadSyncOrchestration());

  const openTextEditor = usePendingActionStore((s) => s.openTextEditor);
  const clearOpenTextEditor = usePendingActionStore((s) => s.clearOpenTextEditor);

  useEffect(() => {
    if (!openTextEditor) return;
    setShowTextEditor(true);
    clearOpenTextEditor();
  }, [openTextEditor, clearOpenTextEditor]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRecordingIdRef = useRef<string | null>(null);

  const refreshCloudSyncIndicator = useCallback(() => {
    void useCloudSyncIndicatorStore.getState().refresh().catch((error) => {
      logger.warn('[HomeScreen] Failed to refresh cloud sync indicator:', error);
    });
  }, []);

  const isAccountSyncEnabled = useCallback(
    () => buildWorkspaceSessionSnapshot(useAuthStore.getState().isAuthenticated).canRunCloudSync,
    []
  );

  const showHomeErrorFeedback = useCallback((title: string, message: string, onRetry?: () => void) => {
    const actions: { label: string; role: 'primary' | 'secondary'; onPress?: () => void }[] = [];
    if (onRetry) {
      actions.push({ label: '重试', role: 'primary', onPress: onRetry });
      actions.push({ label: '忽略', role: 'secondary' });
    } else {
      actions.push({ label: '知道了', role: 'primary' });
    }
    showErrorFeedback({
      title,
      message,
      actions,
    });
  }, []);

  const clearCurrentRecordingEntry = useCallback((entryId: string | null) => {
    if (entryId && currentRecordingIdRef.current === entryId) {
      currentRecordingIdRef.current = null;
    }
  }, []);

  const preloadAudioSafely = useCallback((uri: string) => {
    VoiceService.preloadAudio(uri).catch((err) => {
      logger.warn('[HomeScreen] Failed to preload audio:', err);
    });
  }, []);

  // 初始化：并行加载设置、标签、条目数据，并预热音频系统
  useEffect(() => {
    void Promise.allSettled([
      useSettingsStore.getState().loadSettings(),
      useCommonTagsStore.getState().loadCommonTags(),
      loadEntries(),
    ]).then((results) => {
      const entryLoadResult = results[2];
      if (entryLoadResult?.status === 'rejected') {
        logger.error('[HomeScreen] Failed to initialize home timeline:', entryLoadResult.reason);
        showHomeErrorFeedback('加载失败', '首页记录加载失败，请稍后重试', () => {
          void loadEntries();
        });
      }
    }).finally(() => {
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
          preloadAudioSafely(entry.media![0].uri);
        }
      } catch (error) {
        logger.error('[HomeScreen] Failed to preload voice entries:', error);
      }
    };

    preloadRecentVoiceEntries();
  }, [loadEntries, preloadAudioSafely, refreshCloudSyncIndicator]);

  // 配置上传队列回调
  useEffect(() => {
    const orchestration = uploadSyncOrchestration.current;
    configureVoiceUploadQueueCallbacks(orchestration.voiceCallbacks);
    configurePhotoUploadQueueCallbacks(orchestration.photoCallbacks);
  }, []);

  // 卸载时清理录音资源
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

  const activateRecordingEntry = useCallback((entryId: string) => {
    currentRecordingIdRef.current = entryId;
    startRecordingTimer(entryId);
  }, [startRecordingTimer]);

  const handlePhotoSelectArr = useCallback(async (results: PhotoResult[]) => {
    try {
      const photoCreationPolicy = uploadSyncOrchestration.current.getPhotoCreationPolicy(
        isAccountSyncEnabled()
      );
      await handlePhotoSelectForTest(results, {
        addLocalEntry,
        updateLocalEntry,
        deleteEntry,
        preparePhotoEntryMedia: (photoResults) => preparePhotoEntryMediaService(photoResults, {
          savePhoto: isAccountSyncEnabled()
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
      showHomeErrorFeedback('保存失败', '照片保存失败，请重试');
    }
  }, [addLocalEntry, deleteEntry, isAccountSyncEnabled, showHomeErrorFeedback, updateLocalEntry]); // eslint-disable-line react-hooks/exhaustive-deps

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

      case 'voice': {
        let createdEntryId: string | null = null;
        try {
          assertCanStartVoiceRecordingForTest(currentRecordingIdRef.current);
          if (isAccountSyncEnabled()) {
            const tempEntry = await startCloudVoiceRecordingForTest({
              startRecording: VoiceService.startRecording.bind(VoiceService),
              createLocalEntry: addLocalEntry,
            });
            createdEntryId = tempEntry.id;
            activateRecordingEntry(tempEntry.id);
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
              await VoiceService.startRecording();
              activateRecordingEntry(newEntry.id);
            }
          }
        } catch (error) {
          const handled = await handleVoiceRecordingStartErrorForTest(error, createdEntryId, deleteEntry);

          if (handled) {
            clearCurrentRecordingEntry(createdEntryId);
            return;
          }

          logger.error('[HomeScreen] Failed to start recording:', error);
          showHomeErrorFeedback('录音失败', '开始录音失败，请重试');
          clearCurrentRecordingEntry(createdEntryId);
        }
        break;
      }
    }
  }, [activateRecordingEntry, addEntry, addLocalEntry, clearCurrentRecordingEntry, deleteEntry, handlePhotoSelectArr, isAccountSyncEnabled, showHomeErrorFeedback]);

  const handleStopRecording = useCallback(async (id: string) => {
    clearRecordingTimerForTest(recordingTimerRef);
    try {
      if (isAccountSyncEnabled()) {
        const shouldEnqueueUpload = uploadSyncOrchestration.current.shouldEnqueueVoiceUpload(
          isAccountSyncEnabled()
        );
        await finalizeCloudVoiceRecordingForTest(id, {
          stopRecording: VoiceService.stopRecording.bind(VoiceService),
          prepareVoiceEntryMedia: (entryId, audioFile) => prepareVoiceEntryMediaService(entryId, audioFile, {
            saveVoiceToCache: (sourceUri, currentEntryId) =>
              VoiceService.saveVoiceToCache(sourceUri, currentEntryId),
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

        preloadAudioSafely(persistentUri);
      }
    } catch (error) {
      logger.error('[HomeScreen] Failed to stop recording:', error);
      showHomeErrorFeedback('录音保存失败', '录音文件保存失败，请重试。');
    } finally {
      currentRecordingIdRef.current = null;
    }
  }, [completeRecording, deleteEntry, isAccountSyncEnabled, preloadAudioSafely, showHomeErrorFeedback, updateLocalEntry]);

  const handleTextSave = useCallback(async (content: string, tags: string[]) => {
    try {
      await addEntry({ type: 'text', content, tags, syncStatus: 'pending' });
      setShowTextEditor(false);
    } catch (error) {
      logger.error('[HomeScreen] Failed to save text entry:', error);
      throw error;
    }
  }, [addEntry]);

  return {
    showTextEditor,
    setShowTextEditor,
    handleMediaSelect,
    handleStopRecording,
    handleTextSave,
  };
}

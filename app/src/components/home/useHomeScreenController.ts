/**
 * 首页主控制器 Hook
 * 管理数据加载、上传队列配置、录音生命周期、媒体创建流程
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
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

const RECORDING_DURATION_POLL_MS = 250;

export function useHomeScreenController() {
  const {
    loadEntries, addEntry, addLocalEntry, updateLocalEntry, deleteEntry,
    updateRecordingDuration, completeRecording,
  } = useEntryStore();

  const [showTextEditor, setShowTextEditor] = useState(false);
  const uploadSyncOrchestration = useRef(createHomeUploadSyncOrchestration());
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
        showErrorFeedback({
          title: '加载失败',
          message: '首页记录加载失败，请稍后重试',
          actions: [{ label: '知道了', role: 'primary' }],
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
  }, [addLocalEntry, deleteEntry, isCloudModeEnabled, updateLocalEntry]); // eslint-disable-line react-hooks/exhaustive-deps

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
          showErrorFeedback({
            title: '录音失败',
            message: '开始录音失败，请重试',
            actions: [{ label: '知道了', role: 'primary' }],
          });
          if (createdEntryId && currentRecordingIdRef.current === createdEntryId) {
            currentRecordingIdRef.current = null;
          }
        }
        break;
      }
    }
  }, [addEntry, addLocalEntry, deleteEntry, handlePhotoSelectArr, isCloudModeEnabled, startRecordingTimer]);

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

        VoiceService.preloadAudio(persistentUri).catch((err) => {
          logger.warn('[HomeScreen] Failed to preload audio:', err);
        });
      }
    } catch (error) {
      logger.error('[HomeScreen] Failed to stop recording:', error);
      showErrorFeedback({
        title: '录音保存失败',
        message: '录音文件保存失败，请重试。',
        actions: [{ label: '知道了', role: 'primary' }],
      });
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

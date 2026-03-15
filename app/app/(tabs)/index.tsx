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

const { width: SCREEN_WIDTH } = Dimensions.get('screen');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
const MAIN_TRANSLATE_X = SIDEBAR_WIDTH * 0.8;
const MAIN_SCALE = 0.85;
const MAIN_BORDER_RADIUS = 16;

export interface PhotoSelectDeps {
  savePhotoToStorage: (
    sourceUri: string,
    fileId: string,
    quality: 'low' | 'medium' | 'high',
    aspectRatio?: number
  ) => Promise<import('@/src/services/photoService').SavedPhotoResult>;
  addEntry: (entry: Omit<import('@/src/types/entry').Entry, 'id' | 'timestamp'>) => Promise<void>;
}

export async function handlePhotoSelectForTest(
  result: import('@/src/services/photoService').PhotoResult,
  deps: PhotoSelectDeps
): Promise<void> {
  const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const savedPhoto = await deps.savePhotoToStorage(
    result.uri,
    fileId,
    'medium',
    result.aspectRatio
  );
  await deps.addEntry({
    type: 'photo',
    content: '',
    syncStatus: 'pending',
    media: {
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
    },
  });
}

export default function HomeScreen() {
  const {
    loadEntries, addEntry, deleteEntry,
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

  // 初始化：加载设置 + 数据 + 预热音频
  useEffect(() => {
    // 并行加载设置和条目数据
    Promise.all([
      useSettingsStore.getState().loadSettings(),
      loadEntries(),
    ]).catch(() => {});

    VoiceService.prewarmAudioSystem().catch(() => {});

    const preloadRecentVoiceEntries = async () => {
      try {
        const entries = useEntryStore.getState().entries;
        const voiceEntries = entries
          .filter((e) => e.type === 'voice' && e.media?.uri)
          .slice(0, 3);

        for (const entry of voiceEntries) {
          await VoiceService.preloadAudio(entry.media!.uri).catch((err) => {
            logger.warn('[HomeScreen] Failed to preload audio:', entry.id, err);
          });
        }
      } catch (error) {
        logger.error('[HomeScreen] Failed to preload voice entries:', error);
      }
    };

    preloadRecentVoiceEntries();
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
    recordingTimerRef.current = setInterval(async () => {
      const duration = await VoiceService.getRecordingDuration();
      updateRecordingDuration(entryId, duration);
    }, 100);
  }, [updateRecordingDuration]);

  const handleMediaSelect = useCallback(async (type: 'text' | 'photo' | 'voice', photoResult?: PhotoResult) => {
    switch (type) {
      case 'text':
        setShowTextEditor(true);
        break;

      case 'photo':
        if (photoResult) {
          await handlePhotoSelect(photoResult);
        }
        break;

      case 'voice':
        try {
          await addEntry({
            type: 'voice',
            content: '',
            syncStatus: 'pending',
            recordingStatus: 'recording',
            recordingDuration: 0,
            media: { uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 },
          });

          const entries = useEntryStore.getState().entries;
          const newEntry = entries[0];

          if (newEntry) {
            currentRecordingIdRef.current = newEntry.id;
            await VoiceService.startRecording();
            startRecordingTimer(newEntry.id);
          }
        } catch (error) {
          logger.error('[HomeScreen] Failed to start recording:', error);
          // startRecording 失败时清理已创建的 entry，避免 UI 残留录音卡片
          if (currentRecordingIdRef.current) {
            try {
              await deleteEntry(currentRecordingIdRef.current);
            } catch (e) {
              logger.error('[HomeScreen] Failed to clean up failed recording entry:', e);
            }
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
  }, [addEntry, deleteEntry, startRecordingTimer]);

  const handleResumeRecording = useCallback(async (id: string) => {
    try {
      await VoiceService.resumeRecording();
      updateRecordingStatus(id, 'recording');

      if (!recordingTimerRef.current) {
        startRecordingTimer(id);
      }
    } catch (error) {
      logger.error('[HomeScreen] Failed to resume recording:', error);
    }
  }, [updateRecordingStatus, startRecordingTimer]);

  const handlePauseRecording = useCallback(async (id: string) => {
    try {
      await VoiceService.pauseRecording();
      updateRecordingStatus(id, 'paused');

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } catch (error) {
      logger.error('[HomeScreen] Failed to pause recording:', error);
    }
  }, [updateRecordingStatus]);

  const handleStopRecording = useCallback(async (id: string) => {
    try {
      const audioFile = await VoiceService.stopRecording();
      const persistentUri = await VoiceService.saveVoiceToStorage(audioFile.uri, id);
      await completeRecording(id, persistentUri, audioFile.duration * 1000);

      VoiceService.preloadAudio(persistentUri).catch((err) => {
        logger.warn('[HomeScreen] Failed to preload audio:', err);
      });
    } catch (error) {
      logger.error('[HomeScreen] Failed to stop recording:', error);
    } finally {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      currentRecordingIdRef.current = null;
    }
  }, [completeRecording]);

  const handleTextSave = useCallback(async (content: string, tags: string[]) => {
    try {
      await addEntry({ type: 'text', content, tags, syncStatus: 'pending' });
      setShowTextEditor(false);
    } catch (error) {
      logger.error('[HomeScreen] Failed to save text entry:', error);
    }
  }, [addEntry]);

  const handlePhotoSelect = useCallback(async (result: PhotoResult) => {
    try {
      await handlePhotoSelectForTest(result, {
        savePhotoToStorage: PhotoService.savePhotoToStorage.bind(PhotoService),
        addEntry,
      });
    } catch (error) {
      logger.error('[HomeScreen] Failed to save photo entry:', error);
      Alert.alert('保存失败', '照片保存失败，请重试');
    }
  }, [addEntry]); // eslint-disable-line react-hooks/exhaustive-deps -- handlePhotoSelectForTest is a stable module-level function

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    cancelAnimation(drawerProgress);
    drawerProgress.value = withSpring(1, { damping: 20, stiffness: 200 });
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
      { scale: interpolate(drawerProgress.value, [0, 1], [1, MAIN_SCALE]) },
    ],
    borderRadius: interpolate(drawerProgress.value, [0, 1], [0, MAIN_BORDER_RADIUS]),
    overflow: 'hidden',
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <Animated.View style={[{ flex: 1 }, mainContentStyle]}>
        <Timeline
          onQuickAdd={handleMediaSelect}
          onMenuPress={openDrawer}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
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

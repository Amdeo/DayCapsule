import { View } from 'react-native';
import { useState, useEffect } from 'react';
import { useEntryStore } from '@/src/store/entryStore';
import { Timeline } from '@/src/components/Timeline.v2';
import { Sidebar } from '@/src/components/Sidebar';
import { MediaSelector } from '@/src/components/MediaSelector';
import { PhotoSelector } from '@/src/components/PhotoSelector';
import { TextEditor } from '@/src/components/TextEditor';
import { VoiceService } from '@/src/services/voiceService';

export default function HomeScreen() {
  const { loadEntries, addEntry, updateRecordingStatus, updateRecordingDuration, completeRecording } = useEntryStore();
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);

  // 在组件挂载时加载数据和预初始化音频
  useEffect(() => {
    loadEntries();

    // 预初始化音频系统（后台执行，不阻塞 UI）
    VoiceService.prewarmAudioSystem().catch(() => {
      // 静默失败，不影响用户体验
    });

    // 立即预加载最近的语音记录（不延迟，后台执行）
    const preloadRecentVoiceEntries = async () => {
      try {
        const entries = useEntryStore.getState().entries;
        const voiceEntries = entries
          .filter(e => e.type === 'voice' && e.media?.uri)
          .slice(0, 3); // 只预加载最近3条

        console.log(`[HomeScreen] Preloading ${voiceEntries.length} recent voice entries`);

        for (const entry of voiceEntries) {
          await VoiceService.preloadAudio(entry.media!.uri).catch((error) => {
            console.warn('[HomeScreen] Failed to preload audio:', entry.id, error);
          });
        }

        console.log('[HomeScreen] Voice entries preloaded successfully');
      } catch (error) {
        console.error('[HomeScreen] Failed to preload voice entries:', error);
      }
    };

    // 立即执行预加载（不延迟）
    preloadRecentVoiceEntries();
  }, []);

  // 组件卸载时清理录音
  useEffect(() => {
    console.log('[HomeScreen] Cleanup effect mounted');
    return () => {
      console.log('[HomeScreen] Component unmounting, cleaning up');
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      if (currentRecordingId) {
        console.log('[HomeScreen] Cancelling recording:', currentRecordingId);
        VoiceService.cancelRecording().catch(console.error);
      }
    };
  }, []);

  const startRecordingTimer = (entryId: string) => {
    console.log('[HomeScreen] startRecordingTimer called for entry:', entryId);
    const timer = setInterval(async () => {
      const duration = await VoiceService.getRecordingDuration();
      console.log('[HomeScreen] Timer tick - duration:', duration);
      updateRecordingDuration(entryId, duration);
    }, 100);
    setRecordingTimer(timer);
    console.log('[HomeScreen] Timer started');
  };

  const handleMediaSelect = async (type: 'text' | 'photo' | 'voice') => {
    setShowMediaSelector(false);

    switch(type) {
      case 'text':
        setShowTextEditor(true);
        break;
      case 'photo':
        setShowPhotoSelector(true);
        break;
      case 'voice':
        console.log('[HomeScreen] Starting voice recording');
        try {
          console.log('[HomeScreen] Adding entry to store');
          await addEntry({
            type: 'voice',
            content: '',
            recordingStatus: 'recording',
            recordingDuration: 0,
            media: {
              uri: '',
              type: 'voice',
              duration: 0,
            },
          });
          
          const entries = useEntryStore.getState().entries;
          const newEntry = entries[entries.length - 1];
          console.log('[HomeScreen] New entry created:', newEntry?.id);
          
          if (newEntry) {
            setCurrentRecordingId(newEntry.id);
            console.log('[HomeScreen] Calling VoiceService.startRecording');
            await VoiceService.startRecording();
            console.log('[HomeScreen] VoiceService.startRecording completed');
            startRecordingTimer(newEntry.id);
          }
        } catch (error) {
          console.error('[HomeScreen] Failed to start recording:', error);
        }
        break;
    }
  };

  const handleResumeRecording = async (id: string) => {
    console.log('[HomeScreen] handleResumeRecording called for entry:', id);
    try {
      console.log('[HomeScreen] Calling VoiceService.resumeRecording');
      await VoiceService.resumeRecording();
      console.log('[HomeScreen] VoiceService.resumeRecording completed');
      
      console.log('[HomeScreen] Updating entry status to recording');
      updateRecordingStatus(id, 'recording');
      
      if (!recordingTimer) {
        console.log('[HomeScreen] Starting recording timer');
        startRecordingTimer(id);
      } else {
        console.log('[HomeScreen] Timer already running');
      }
      console.log('[HomeScreen] Resume completed');
    } catch (error) {
      console.error('[HomeScreen] Failed to resume recording:', error);
    }
  };

  const handleStopRecording = async (id: string) => {
    console.log('[HomeScreen] handleStopRecording called for entry:', id);
    try {
      console.log('[HomeScreen] Calling VoiceService.stopRecording');
      const audioFile = await VoiceService.stopRecording();
      console.log('[HomeScreen] VoiceService.stopRecording completed, audioFile:', audioFile);

      console.log('[HomeScreen] Completing recording in store');
      await completeRecording(id, audioFile.uri, audioFile.duration * 1000);

      // 立即预加载音频，减少播放时的延迟
      console.log('[HomeScreen] Preloading audio for instant playback');
      VoiceService.preloadAudio(audioFile.uri).catch((error) => {
        console.warn('[HomeScreen] Failed to preload audio:', error);
      });

      if (recordingTimer) {
        console.log('[HomeScreen] Clearing recording timer');
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      setCurrentRecordingId(null);
      console.log('[HomeScreen] Stop completed');
    } catch (error) {
      console.error('[HomeScreen] Failed to stop recording:', error);
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      setCurrentRecordingId(null);
    }
  };

  const handleTextSave = (content: string, tags: string[]) => {
    addEntry({
      type: 'text',
      content,
      tags,
    });
    setShowTextEditor(false);
  };

  const handlePhotoSelect = (uri: string) => {
    addEntry({
      type: 'photo',
      content: '',
      media: {
        uri,
        type: 'photo',
      },
    });
    setShowPhotoSelector(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      {/* 时间轴内容（包含搜索栏） */}
      <Timeline
        onQuickAdd={handleMediaSelect}
        onMenuPress={() => setShowSidebar(true)}
        onStopRecording={handleStopRecording}
        onOpenMediaSelector={() => setShowMediaSelector(true)}
      />

      {/* 侧边栏 */}
      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />

      {/* 媒体选择器模态框 */}
      <MediaSelector
        visible={showMediaSelector}
        onSelect={handleMediaSelect}
        onCancel={() => setShowMediaSelector(false)}
      />

      {/* 照片选择器模态框 */}
      <PhotoSelector
        visible={showPhotoSelector}
        onSelectPhoto={handlePhotoSelect}
        onCancel={() => setShowPhotoSelector(false)}
      />

      {/* 文本编辑器模态框 */}
      <TextEditor
        visible={showTextEditor}
        onSave={handleTextSave}
        onCancel={() => setShowTextEditor(false)}
      />
    </View>
  );
}

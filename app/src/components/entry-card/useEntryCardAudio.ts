import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { showAppDialog } from '@/src/services/showAppDialog';
import type { Entry } from '@/src/types/entry';
import { VoiceService } from '@/src/services/voiceService';
import { logger } from '@/src/utils/logger';

interface UseEntryCardAudioOptions {
  entry: Entry;
  currentPlayingId: string | null;
  setCurrentPlayingId: (id: string | null) => void;
}

interface EntryCardAudioState {
  audioMissing: boolean;
  isPlayingAudio: boolean;
  playbackPosition: number;
  handlePlayAudio: () => Promise<void>;
  handleStopAudio: () => Promise<void>;
}

export function useEntryCardAudio({
  entry,
  currentPlayingId,
  setCurrentPlayingId,
}: UseEntryCardAudioOptions): EntryCardAudioState {
  const [audioMissing, setAudioMissing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  const showBlockingNotice = (title: string, message: string) => {
    showAppDialog({
      title,
      message,
      tone: 'error',
      blocking: true,
      actions: [{ label: '知道了', role: 'primary' }],
    });
  };

  useEffect(() => {
    logger.log(
      '[EntryCard] currentPlayingId changed:',
      currentPlayingId,
      'myId:',
      entry.id,
      'isPlayingAudio:',
      isPlayingAudio,
    );
    if (currentPlayingId !== entry.id && isPlayingAudio) {
      logger.log('[EntryCard] resetting card', entry.id);
      setIsPlayingAudio(false);
      setPlaybackPosition(0);
    }
  }, [currentPlayingId, entry.id, isPlayingAudio]);

  const handleStopAudio = async () => {
    try {
      await VoiceService.stopPlayback();
    } catch (error) {
      logger.error('Failed to stop audio:', error);
    } finally {
      setIsPlayingAudio(false);
      setPlaybackPosition(0);
      setCurrentPlayingId(null);
    }
  };

  const handlePlayAudio = async () => {
    const uri = entry.media?.[0]?.uri || entry.content;

    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        setAudioMissing(true);
        showBlockingNotice('文件不存在', '音频文件已丢失或被删除，无法播放。');
        return;
      }
      setAudioMissing(false);
    } catch {
      // getInfoAsync 本身失败时降级到播放，让 VoiceService 处理错误
    }

    try {
      setIsPlayingAudio(true);
      setPlaybackPosition(0);
      setCurrentPlayingId(entry.id);

      await VoiceService.playAudio(
        uri,
        () => {
          setIsPlayingAudio(false);
          setPlaybackPosition(0);
          setCurrentPlayingId(null);
        },
        (position) => {
          setPlaybackPosition(position);
        },
      );
    } catch (error) {
      logger.error('Failed to play audio:', error);
      showBlockingNotice('播放失败', '无法播放此音频，请重试');
      setIsPlayingAudio(false);
      setPlaybackPosition(0);
      setCurrentPlayingId(null);
    }
  };

  return {
    audioMissing,
    isPlayingAudio,
    playbackPosition,
    handlePlayAudio,
    handleStopAudio,
  };
}

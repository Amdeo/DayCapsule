import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
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
      showErrorFeedback({
        title: '停止失败',
        message: '停止播放失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
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
        showErrorFeedback({
          title: '文件不存在',
          message: '音频文件已丢失或被删除，无法播放。',
          actions: [{ label: '知道了', role: 'primary' }],
        });
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
      showErrorFeedback({
        title: '播放失败',
        message: '无法播放此音频，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
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

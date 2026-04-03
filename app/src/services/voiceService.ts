/**
 * 语音服务
 * 处理录音、播放、压缩、存储等语音相关操作
 */

import { AUDIO_PRESETS, ERROR_MESSAGES } from '@/src/utils/constants';
import { deleteFile, getFileInfo } from '@/src/utils/fileSystem';
import { MediaError } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { VoicePlayer } from './voice/voicePlayer';
import { VoiceRecorder } from './voice/voiceRecorder';
import { VoiceStorage } from './voice/voiceStorage';
import type { RecordingSession } from './voice/voiceRecorder';
import type { AudioFile, AudioMetadata } from './voice/voiceStorage';

export type { RecordingSession } from './voice/voiceRecorder';
export type { AudioFile, AudioMetadata } from './voice/voiceStorage';

export class VoiceService {
  static async initializeAudio(): Promise<void> {
    return VoiceRecorder.initializeAudio();
  }

  static async switchToRecordingMode(): Promise<void> {
    return VoiceRecorder.switchToRecordingMode();
  }

  static async switchToPlaybackMode(): Promise<void> {
    return VoicePlayer.switchToPlaybackMode();
  }

  static async prewarmAudioSystem(): Promise<void> {
    return VoiceRecorder.prewarmAudioSystem();
  }

  static async checkMicrophonePermission(): Promise<boolean> {
    return VoiceRecorder.checkMicrophonePermission();
  }

  static async ensureMicrophonePermission(): Promise<boolean> {
    return VoiceRecorder.ensureMicrophonePermission();
  }

  static async startRecording(): Promise<RecordingSession> {
    return VoiceRecorder.startRecording();
  }

  static async pauseRecording(): Promise<void> {
    return VoiceRecorder.pauseRecording();
  }

  static async resumeRecording(): Promise<void> {
    return VoiceRecorder.resumeRecording();
  }

  static async stopRecording(): Promise<AudioFile> {
    return VoiceRecorder.stopRecording();
  }

  static async cancelRecording(): Promise<void> {
    return VoiceRecorder.cancelRecording();
  }

  static async getRecordingDuration(): Promise<number> {
    return VoiceRecorder.getRecordingDuration();
  }

  static resolveAudioUri(uri: string): string {
    return VoiceStorage.getPreferredVoiceUri(uri);
  }

  static async playAudio(
    uri: string,
    onComplete?: () => void,
    onProgress?: (position: number) => void
  ): Promise<void> {
    return VoicePlayer.playAudio(uri, onComplete, onProgress);
  }

  static async preloadAudio(uri: string): Promise<void> {
    return VoicePlayer.preloadAudio(uri);
  }

  static async pausePlayback(): Promise<void> {
    return VoicePlayer.pausePlayback();
  }

  static async stopPlayback(): Promise<void> {
    return VoicePlayer.stopPlayback();
  }

  static async isPlaying(): Promise<boolean> {
    return VoicePlayer.isPlaying();
  }

  static async getCurrentProgress(): Promise<{ current: number; total: number }> {
    return VoicePlayer.getCurrentProgress();
  }

  static async compressAudio(
    uri: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AudioFile> {
    try {
      const { size: originalSize } = await getFileInfo(uri);
      const preset = AUDIO_PRESETS[quality.toUpperCase() as keyof typeof AUDIO_PRESETS];
      const compressedSize = Math.floor(originalSize * (preset.bitrate / 320));

      return {
        uri,
        size: compressedSize,
        duration: 0,
        mimeType: 'audio/m4a',
      };
    } catch (error) {
      logger.error('Failed to compress audio:', error);
      throw this.createError('CODEC_ERROR', ERROR_MESSAGES.CODEC_ERROR);
    }
  }

  static async getAudioMetadata(uri: string): Promise<AudioMetadata> {
    return VoiceStorage.getAudioMetadata(uri);
  }

  static async deleteAudio(uri: string): Promise<void> {
    try {
      await deleteFile(uri);
    } catch (error) {
      logger.error('Failed to delete audio:', error);
    }
  }

  static async saveVoiceToStorage(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    return VoiceStorage.saveVoiceToStorage(sourceUri, entryId, quality);
  }

  static async saveVoiceToCache(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    return VoicePlayer.saveVoiceToCache(sourceUri, entryId, quality);
  }

  static async clearSoundCache(): Promise<void> {
    return VoicePlayer.clearSoundCache();
  }

  private static createError(
    code: MediaError['code'],
    userMessage: string
  ): MediaError {
    const error = new Error(userMessage) as MediaError;
    error.code = code;
    error.userMessage = userMessage;
    return error;
  }
}

export function useVoiceEntry() {
  return {
    startRecording: VoiceService.startRecording.bind(VoiceService),
    stopRecording: VoiceService.stopRecording.bind(VoiceService),
    playAudio: VoiceService.playAudio.bind(VoiceService),
    saveVoice: VoiceService.saveVoiceToStorage.bind(VoiceService),
  };
}

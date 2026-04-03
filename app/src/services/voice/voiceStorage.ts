import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { STORAGE_QUOTA, ERROR_MESSAGES } from '@/src/utils/constants';
import {
  copyFile,
  generateUniqueFilename,
  getFileInfo,
  getMediaPaths,
} from '@/src/utils/fileSystem';
import { MediaError } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { MediaCacheService } from '../mediaCacheService';

export interface AudioFile {
  uri: string;
  size: number;
  duration: number;
  mimeType: string;
}

export interface AudioMetadata {
  duration: number;
  size: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

export class VoiceStorage {
  static async saveVoiceToStorage(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    return this.saveVoice(sourceUri, entryId, getMediaPaths().voiceOriginal, quality);
  }

  static async saveVoiceToCache(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    return this.saveVoice(sourceUri, entryId, getMediaPaths().voiceCompressed, quality);
  }

  static getPreferredVoiceUri(uri: string): string {
    if (MediaCacheService.isRemoteUri(uri)) {
      return MediaCacheService.normalizeRemoteUri(uri);
    }

    return this.getFallbackVoiceUri(uri) ?? uri;
  }

  static getFallbackVoiceUri(uri: string): string | null {
    const voiceOriginalRelative = 'media/voice/original/';
    if (uri.includes(voiceOriginalRelative)) {
      const filename = uri.split(voiceOriginalRelative).pop();
      if (filename) {
        return `${getMediaPaths().voiceOriginal}${filename}`;
      }
    }

    if (!uri.includes('/')) {
      return `${getMediaPaths().voiceOriginal}${uri}`;
    }

    return null;
  }

  static async getAudioMetadata(uri: string): Promise<AudioMetadata> {
    try {
      const { size } = await getFileInfo(uri);
      const sound = createAudioPlayer(uri, { updateInterval: 100 });
      await this.waitForPlayerLoaded(sound);
      const metadata = {
        duration: sound.duration || 0,
        size,
      };
      sound.remove();
      return metadata;
    } catch (error) {
      logger.error('Failed to get audio metadata:', error);
      return {
        duration: 0,
        size: 0,
      };
    }
  }

  static async saveVoice(
    sourceUri: string,
    entryId: string,
    targetDir: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    try {
      const { size } = await getFileInfo(sourceUri);
      if (size > STORAGE_QUOTA.MAX_AUDIO_SIZE) {
        throw this.createError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.FILE_TOO_LARGE);
      }

      const filename = generateUniqueFilename(entryId, 'voice', 'm4a');
      return await copyFile(sourceUri, targetDir, filename);
    } catch (error) {
      if ((error as MediaError)?.code) {
        throw error;
      }
      logger.error('Failed to save voice:', error);
      throw this.createError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.STORAGE_FULL);
    }
  }

  private static async waitForPlayerLoaded(player: AudioPlayer): Promise<void> {
    if (player.isLoaded) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let subscription: { remove: () => void } | null = null;
      const timeout = setTimeout(() => {
        subscription?.remove();
        reject(new Error('Timed out waiting for audio to load'));
      }, 15000);

      subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (status.isLoaded) {
          clearTimeout(timeout);
          subscription?.remove();
          resolve();
        }
      });
    });
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

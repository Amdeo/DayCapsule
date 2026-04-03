import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import { ERROR_MESSAGES } from '@/src/utils/constants';
import { getFileInfo, getMediaPaths } from '@/src/utils/fileSystem';
import { MediaError } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { VoiceRecorder } from './voiceRecorder';
import { VoiceStorage } from './voiceStorage';

export class VoicePlayer {
  private static sound: AudioPlayer | null = null;
  private static soundCache: Map<string, AudioPlayer> = new Map();
  private static soundAccessTime: Map<string, number> = new Map();
  private static readonly MAX_CACHE_SIZE = 5;
  private static currentPlayingUri: string | null = null;
  private static prevOnComplete: (() => void) | null = null;
  private static playbackSubscription: { remove: () => void } | null = null;

  static async switchToPlaybackMode(): Promise<void> {
    try {
      await this.setPlaybackAudioMode();
      VoiceRecorder.markPlaybackMode();
      logger.log('[VoiceService] Switched to playback mode');
    } catch (error) {
      logger.error('Failed to switch to playback mode:', error);
    }
  }

  static async playAudio(
    uri: string,
    onComplete?: () => void,
    onProgress?: (position: number) => void
  ): Promise<void> {
    try {
      const resolvedUri = VoiceStorage.getPreferredVoiceUri(uri);
      if (resolvedUri !== uri) {
        logger.log('[playAudio] uri resolved:', uri.slice(-30), '→', resolvedUri.slice(-30));
      }
      uri = resolvedUri;

      logger.log('[playAudio] ▶ called uri:', uri.slice(-30));
      logger.log('[playAudio] currentPlayingUri:', this.currentPlayingUri?.slice(-30) ?? 'null');

      if (!/^https?:\/\//i.test(uri)) {
        const { exists } = await getFileInfo(uri);
        if (!exists) {
          logger.warn('[playAudio] File not found:', uri.slice(-50));
          throw this.createError('CODEC_ERROR', '音频文件不存在或已被删除');
        }
      }

      if (this.currentPlayingUri === uri && this.sound?.isLoaded && this.sound.playing) {
        logger.log('[playAudio] already playing, return early');
        return;
      }

      if (this.sound && this.currentPlayingUri !== uri) {
        logger.log('[playAudio] stopping previous sound');
        this.sound.pause();
        await this.sound.seekTo(0);
        this.playbackSubscription?.remove();
        this.playbackSubscription = null;
        this.prevOnComplete?.();
        this.prevOnComplete = null;
        this.sound = null;
      }

      await this.switchToPlaybackMode();

      const fromCache = this.soundCache.has(uri);
      logger.log('[playAudio] loadToCache fromCache:', fromCache);
      const sound = await this.preloadSound(uri);
      this.sound = sound;
      this.currentPlayingUri = uri;
      this.prevOnComplete = onComplete || null;

      this.playbackSubscription?.remove();
      this.playbackSubscription = this.sound.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          if (!status.isLoaded) {
            return;
          }
          if (onProgress && status.playing) {
            onProgress(status.currentTime * 1000);
          }
          if (status.didJustFinish) {
            logger.log('[playAudio] didJustFinish');
            this.currentPlayingUri = null;
            this.prevOnComplete = null;
            this.playbackSubscription?.remove();
            this.playbackSubscription = null;
            onComplete?.();
          }
        }
      );

      await this.sound.seekTo(0);
      logger.log('[playAudio] calling play...');
      this.sound.play();
      logger.log('[playAudio] play done');
    } catch (error) {
      logger.error('[playAudio] error:', error);
      this.currentPlayingUri = null;
      throw this.createError('CODEC_ERROR', ERROR_MESSAGES.CODEC_ERROR);
    }
  }

  static async preloadAudio(uri: string): Promise<void> {
    try {
      const resolvedUri = VoiceStorage.getPreferredVoiceUri(uri);
      if (this.soundCache.has(resolvedUri)) {
        return;
      }

      if (!/^https?:\/\//i.test(resolvedUri)) {
        const { exists } = await getFileInfo(resolvedUri);
        if (!exists) {
          logger.warn('[VoiceService] Preload skipped, file not found:', resolvedUri.slice(-40));
          return;
        }
      }

      await this.switchToPlaybackMode();
      await this.preloadSound(resolvedUri);
      logger.log('[VoiceService] Audio preloaded:', resolvedUri);
    } catch (error) {
      logger.error('[VoiceService] Failed to preload audio:', error);
    }
  }

  static async pausePlayback(): Promise<void> {
    try {
      if (!this.sound) {
        return;
      }
      this.sound.pause();
    } catch (error) {
      logger.error('Failed to pause playback:', error);
    }
  }

  static async stopPlayback(): Promise<void> {
    try {
      if (!this.sound) {
        return;
      }
      this.sound.pause();
      await this.sound.seekTo(0);
      this.playbackSubscription?.remove();
      this.playbackSubscription = null;
      this.sound = null;
      this.currentPlayingUri = null;
    } catch (error) {
      logger.error('Failed to stop playback:', error);
    }
  }

  static async isPlaying(): Promise<boolean> {
    try {
      return !!(this.sound?.isLoaded && this.sound.playing);
    } catch (error) {
      logger.error('Failed to check playback status:', error);
      return false;
    }
  }

  static async getCurrentProgress(): Promise<{ current: number; total: number }> {
    try {
      if (!this.sound) {
        return { current: 0, total: 0 };
      }

      return {
        current: this.sound.currentTime || 0,
        total: this.sound.duration || 0,
      };
    } catch (error) {
      logger.error('Failed to get playback progress:', error);
      return { current: 0, total: 0 };
    }
  }

  static async saveVoiceToCache(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    return VoiceStorage.saveVoice(sourceUri, entryId, getMediaPaths().voiceCompressed, quality);
  }

  static async clearSoundCache(): Promise<void> {
    this.playbackSubscription?.remove();
    this.playbackSubscription = null;
    for (const [, sound] of this.soundCache) {
      sound.remove();
    }
    this.soundCache.clear();
    this.soundAccessTime.clear();
    this.currentPlayingUri = null;
    this.sound = null;
  }

  private static async preloadSound(uri: string): Promise<AudioPlayer> {
    let sound = this.soundCache.get(uri);
    if (!sound) {
      sound = createAudioPlayer(uri, { updateInterval: 100 });
      await this.waitForPlayerLoaded(sound);
      await this.evictLruSound();
      this.soundCache.set(uri, sound);
    }
    this.soundAccessTime.set(uri, Date.now());
    return sound;
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

  private static async evictLruSound(): Promise<void> {
    if (this.soundCache.size < this.MAX_CACHE_SIZE) {
      return;
    }
    const lruKey = Array.from(this.soundAccessTime.entries())
      .sort((a, b) => a[1] - b[1])[0]?.[0];
    if (!lruKey) {
      return;
    }
    const oldSound = this.soundCache.get(lruKey);
    oldSound?.remove();
    this.soundCache.delete(lruKey);
    this.soundAccessTime.delete(lruKey);
  }

  private static async setPlaybackAudioMode(): Promise<void> {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionModeAndroid: 'duckOthers',
      shouldRouteThroughEarpiece: false,
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

/**
 * 语音服务
 * 处理录音、播放、压缩、存储等语音相关操作
 */

import {
  AudioModule,
  createAudioPlayer,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
} from 'expo-audio';
import {
  AUDIO_PRESETS,
  STORAGE_QUOTA,
  ERROR_MESSAGES,
} from '@/src/utils/constants';
import {
  MEDIA_PATHS,
  generateUniqueFilename,
  deleteFile,
  getFileInfo,
  copyFile,
} from '@/src/utils/fileSystem';
import { MediaError } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { MediaCacheService } from './mediaCacheService';

/**
 * 录音会话
 */
export interface RecordingSession {
  id: string;
  startTime: number;
  uri?: string;
  duration: number; // 毫秒
}

/**
 * 音频文件
 */
export interface AudioFile {
  uri: string;
  size: number;
  duration: number; // 秒
  mimeType: string;
}

/**
 * 音频元数据
 */
export interface AudioMetadata {
  duration: number; // 秒
  size: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

/**
 * 语音服务类
 */
export class VoiceService {
  private static recorder: AudioRecorder | null = null;
  private static sound: AudioPlayer | null = null;
  private static recordingSession: RecordingSession | null = null;
  private static isAudioInitialized = false;
  private static currentAudioMode: 'recording' | 'playback' | null = null;
  private static soundCache: Map<string, AudioPlayer> = new Map();
  private static soundAccessTime: Map<string, number> = new Map();
  private static readonly MAX_CACHE_SIZE = 5;
  private static currentPlayingUri: string | null = null;
  private static prevOnComplete: (() => void) | null = null;
  private static playbackSubscription: { remove: () => void } | null = null;

  /**
   * 初始化音频系统为录音模式
   */
  static async initializeAudio(): Promise<void> {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionModeAndroid: 'duckOthers',
      });
      this.isAudioInitialized = true;
      this.currentAudioMode = 'recording';
    } catch (error) {
      logger.error('Failed to initialize audio:', error);
    }
  }

  /**
   * 切换到录音模式
   */
  static async switchToRecordingMode(): Promise<void> {
    if (this.currentAudioMode === 'recording') {
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionModeAndroid: 'duckOthers',
      });
      this.currentAudioMode = 'recording';
      logger.log('[VoiceService] Switched to recording mode');
    } catch (error) {
      logger.error('Failed to switch to recording mode:', error);
    }
  }

  /**
   * 切换到播放模式（始终执行，不依赖缓存状态）
   */
  static async switchToPlaybackMode(): Promise<void> {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionModeAndroid: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });
      this.currentAudioMode = 'playback';
      logger.log('[VoiceService] Switched to playback mode');
    } catch (error) {
      logger.error('Failed to switch to playback mode:', error);
    }
  }

  /**
   * 预初始化音频系统（用于提前准备）
   * 静默失败，不抛出错误
   */
  static async prewarmAudioSystem(): Promise<void> {
    try {
      logger.log('[VoiceService] Starting audio system prewarm...');

      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        logger.log('[VoiceService] Microphone permission not granted, skipping prewarm');
        return;
      }

      if (!this.isAudioInitialized) {
        await this.initializeAudio();
        logger.log('[VoiceService] Audio system prewarmed successfully');
      } else {
        logger.log('[VoiceService] Audio system already initialized');
      }
    } catch (error) {
      logger.error('[VoiceService] Failed to prewarm audio system:', error);
    }
  }

  /**
   * 检查麦克风权限状态（不弹窗）
   */
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const { granted } = await getRecordingPermissionsAsync();
      return granted;
    } catch (error) {
      logger.error('Failed to check microphone permission:', error);
      return false;
    }
  }

  /**
   * 确保麦克风权限已授予
   */
  static async ensureMicrophonePermission(): Promise<boolean> {
    try {
      const hasPermission = await this.checkMicrophonePermission();
      if (hasPermission) {
        return true;
      }

      const { granted } = await requestRecordingPermissionsAsync();
      return granted;
    } catch (error) {
      logger.error('Failed to ensure microphone permission:', error);
      return false;
    }
  }

  /**
   * 开始录音
   */
  static async startRecording(): Promise<RecordingSession> {
    try {
      const granted = await this.ensureMicrophonePermission();
      if (!granted) {
        throw this.createError('PERMISSION_DENIED', ERROR_MESSAGES.MICROPHONE_ERROR);
      }

      if (!this.isAudioInitialized) {
        await this.initializeAudio();
      } else {
        await this.switchToRecordingMode();
      }

      this.recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await this.recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      this.recorder.record();

      this.recordingSession = {
        id: Date.now().toString(),
        startTime: Date.now(),
        duration: 0,
      };

      return this.recordingSession;
    } catch (error) {
      logger.error('Failed to start recording:', error);
      if (this.recorder) {
        try {
          await this.recorder.stop();
        } catch {}
        this.recorder = null;
      }
      this.recordingSession = null;
      if ((error as MediaError)?.code) {
        throw error;
      }
      throw this.createError('MICROPHONE_ERROR', ERROR_MESSAGES.MICROPHONE_ERROR);
    }
  }

  /**
   * 暂停录音
   */
  static async pauseRecording(): Promise<void> {
    try {
      if (!this.recorder) {
        throw new Error('No active recording');
      }
      this.recorder.pause();
    } catch (error) {
      logger.error('Failed to pause recording:', error);
    }
  }

  /**
   * 恢复录音
   */
  static async resumeRecording(): Promise<void> {
    try {
      if (!this.recorder) {
        throw new Error('No active recording');
      }
      this.recorder.record();
    } catch (error) {
      logger.error('Failed to resume recording:', error);
    }
  }

  /**
   * 停止录音并保存
   */
  static async stopRecording(): Promise<AudioFile> {
    try {
      if (!this.recorder) {
        throw new Error('No active recording');
      }

      const status = this.recorder.getStatus();
      const duration = (status.durationMillis || 0) / 1000;

      if (!status.canRecord && !status.isRecording) {
        logger.warn('[stopRecording] recorder not prepared, cleaning up');
        this.recorder = null;
        this.recordingSession = null;
        throw new Error('Recorder not prepared');
      }

      await this.recorder.stop();

      const finalStatus = this.recorder.getStatus();
      const uri = this.recorder.uri || finalStatus.url;
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      const { size } = await getFileInfo(uri);

      this.recorder = null;
      this.recordingSession = null;

      return {
        uri,
        size,
        duration,
        mimeType: 'audio/m4a',
      };
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      throw this.createError('DEVICE_ERROR', ERROR_MESSAGES.DEVICE_ERROR);
    }
  }

  /**
   * 取消录音
   */
  static async cancelRecording(): Promise<void> {
    try {
      if (!this.recorder) {
        return;
      }

      const status = this.recorder.getStatus();
      if (status.canRecord || status.isRecording) {
        await this.recorder.stop();
        const uri = this.recorder.uri || this.recorder.getStatus().url;
        if (uri) {
          await deleteFile(uri);
        }
      }

      this.recorder = null;
      this.recordingSession = null;
    } catch (error) {
      logger.error('Failed to cancel recording:', error);
      this.recorder = null;
      this.recordingSession = null;
    }
  }

  /**
   * 获取当前录音时长
   */
  static async getRecordingDuration(): Promise<number> {
    try {
      if (!this.recorder) {
        return 0;
      }

      const status = this.recorder.getStatus();
      return (status.durationMillis || 0) / 1000;
    } catch (error) {
      logger.error('Failed to get recording duration:', error);
      return 0;
    }
  }

  /**
   * 解析音频 URI：兼容旧绝对路径（沙盒 UUID 可能已变）
   * 统一提取文件名后用当前 documentDirectory 重建路径
   */
  static resolveAudioUri(uri: string): string {
    if (MediaCacheService.isRemoteUri(uri)) {
      return MediaCacheService.normalizeRemoteUri(uri);
    }

    const voiceOriginalRelative = 'media/voice/original/';
    if (uri.includes(voiceOriginalRelative)) {
      const filename = uri.split(voiceOriginalRelative).pop();
      if (filename) {
        return `${MEDIA_PATHS.voiceOriginal}${filename}`;
      }
    }
    if (!uri.includes('/')) {
      return `${MEDIA_PATHS.voiceOriginal}${uri}`;
    }
    return uri;
  }

  /**
   * LRU 缓存淘汰：移除最久未访问的音频
   */
  private static async evictLruIfNeeded(): Promise<void> {
    if (this.soundCache.size < this.MAX_CACHE_SIZE) return;
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

  /**
   * 加载音频到缓存并返回播放器实例
   */
  private static async loadToCache(uri: string): Promise<AudioPlayer> {
    let sound = this.soundCache.get(uri);
    if (!sound) {
      sound = createAudioPlayer(uri, { updateInterval: 100 });
      await this.waitForPlayerLoaded(sound);
      await this.evictLruIfNeeded();
      this.soundCache.set(uri, sound);
    }
    this.soundAccessTime.set(uri, Date.now());
    return sound;
  }

  /**
   * 播放音频（优化版 - 支持预加载和缓存）
   */
  static async playAudio(
    uri: string,
    onComplete?: () => void,
    onProgress?: (position: number) => void
  ): Promise<void> {
    try {
      const resolvedUri = this.resolveAudioUri(uri);
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
      const sound = await this.loadToCache(uri);
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

  /**
   * 预加载音频（在后台加载，不播放）
   */
  static async preloadAudio(uri: string): Promise<void> {
    try {
      const resolvedUri = this.resolveAudioUri(uri);
      if (this.soundCache.has(resolvedUri)) return;

      if (!/^https?:\/\//i.test(resolvedUri)) {
        const { exists } = await getFileInfo(resolvedUri);
        if (!exists) {
          logger.warn('[VoiceService] Preload skipped, file not found:', resolvedUri.slice(-40));
          return;
        }
      }

      await this.switchToPlaybackMode();
      await this.loadToCache(resolvedUri);
      logger.log('[VoiceService] Audio preloaded:', resolvedUri);
    } catch (error) {
      logger.error('[VoiceService] Failed to preload audio:', error);
    }
  }

  /**
   * 暂停播放
   */
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

  /**
   * 停止播放
   */
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

  /**
   * 检查是否正在播放
   */
  static async isPlaying(): Promise<boolean> {
    try {
      return !!(this.sound?.isLoaded && this.sound.playing);
    } catch (error) {
      logger.error('Failed to check playback status:', error);
      return false;
    }
  }

  /**
   * 获取当前播放进度
   */
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

  /**
   * 压缩音频
   */
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

  /**
   * 获取音频元数据
   */
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

  /**
   * 删除音频文件
   */
  static async deleteAudio(uri: string): Promise<void> {
    try {
      await deleteFile(uri);
    } catch (error) {
      logger.error('Failed to delete audio:', error);
    }
  }

  /**
   * 保存语音记录到本地
   */
  static async saveVoiceToStorage(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    return this.saveVoice(sourceUri, entryId, MEDIA_PATHS.voiceOriginal, quality);
  }

  static async saveVoiceToCache(
    sourceUri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    return this.saveVoice(sourceUri, entryId, MEDIA_PATHS.voiceCompressed, quality);
  }

  private static async saveVoice(
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
      const targetUri = await copyFile(sourceUri, targetDir, filename);

      return targetUri;
    } catch (error) {
      if ((error as MediaError)?.code) {
        throw error;
      }
      logger.error('Failed to save voice:', error);
      throw this.createError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.STORAGE_FULL);
    }
  }

  /**
   * 清除音频缓存
   */
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

  /**
   * 创建媒体错误
   */
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

/**
 * 语音相关的 Hook - 直接委托给 VoiceService
 */
export function useVoiceEntry() {
  return {
    startRecording: VoiceService.startRecording.bind(VoiceService),
    stopRecording: VoiceService.stopRecording.bind(VoiceService),
    playAudio: VoiceService.playAudio.bind(VoiceService),
    saveVoice: VoiceService.saveVoiceToStorage.bind(VoiceService),
  };
}

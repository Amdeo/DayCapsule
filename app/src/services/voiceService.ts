/**
 * 语音服务
 * 处理录音、播放、压缩、存储等语音相关操作
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
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
} from '@/src/utils/fileSystem';
import { MediaError, AudioCompressionOptions } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';

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
  private static recorder: Audio.Recording | null = null;
  private static sound: Audio.Sound | null = null;
  private static recordingSession: RecordingSession | null = null;
  private static isAudioInitialized: boolean = false;
  private static currentAudioMode: 'recording' | 'playback' | null = null;
  private static soundCache: Map<string, Audio.Sound> = new Map();
  private static soundAccessTime: Map<string, number> = new Map();
  private static readonly MAX_CACHE_SIZE = 5;
  private static currentPlayingUri: string | null = null;
  private static prevOnComplete: (() => void) | null = null;

  /**
   * 初始化音频系统为录音模式
   */
  static async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,

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
      return; // 已经是录音模式，无需切换
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,

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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
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

      // 检查权限状态（不弹窗）
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        logger.log('[VoiceService] Microphone permission not granted, skipping prewarm');
        return;
      }

      // 预初始化音频系统
      if (!this.isAudioInitialized) {
        await this.initializeAudio();
        logger.log('[VoiceService] Audio system prewarmed successfully');
      } else {
        logger.log('[VoiceService] Audio system already initialized');
      }
    } catch (error) {
      logger.error('[VoiceService] Failed to prewarm audio system:', error);
      // 静默失败，不影响用户
    }
  }

  /**
   * 检查麦克风权限状态（不弹窗）
   * 使用 Audio API 而非 Camera API，确保 expo-av 录音权限正确识别
   */
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const { granted } = await Audio.getPermissionsAsync();
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
      // 先检查权限状态
      const hasPermission = await this.checkMicrophonePermission();
      if (hasPermission) {
        return true;
      }

      // 未授权时才请求
      const { granted } = await Audio.requestPermissionsAsync();
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
      // 检查权限（优化：先查询再请求）
      const granted = await this.ensureMicrophonePermission();
      if (!granted) {
        throw this.createError(
          'PERMISSION_DENIED',
          ERROR_MESSAGES.MICROPHONE_ERROR
        );
      }

      // 初始化音频系统或切换到录音模式
      if (!this.isAudioInitialized) {
        await this.initializeAudio();
      } else {
        await this.switchToRecordingMode();
      }

      // 创建录音实例
      this.recorder = new Audio.Recording();

      // 配置录音选项
      await this.recorder.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      await this.recorder.startAsync();

      this.recordingSession = {
        id: Date.now().toString(),
        startTime: Date.now(),
        duration: 0,
      };

      return this.recordingSession;
    } catch (error) {
      logger.error('Failed to start recording:', error);
      // 清理未准备好的 recorder，防止后续 stopRecording 崩溃
      if (this.recorder) {
        try { await this.recorder.stopAndUnloadAsync(); } catch {}
        this.recorder = null;
      }
      this.recordingSession = null;
      if ((error as any)?.code) {
        throw error; // 已是 MediaError，直接透传
      }
      throw this.createError(
        'MICROPHONE_ERROR',
        ERROR_MESSAGES.MICROPHONE_ERROR
      );
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
      await this.recorder.pauseAsync();
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
      await this.recorder.startAsync();
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

      // 先获取状态，确认 recorder 已准备好再操作
      const status = await this.recorder.getStatusAsync();
      const duration = (status.durationMillis || 0) / 1000;

      if (!status.canRecord && !status.isRecording) {
        // recorder 存在但未准备好，直接清理
        logger.warn('[stopRecording] recorder not prepared, cleaning up');
        this.recorder = null;
        this.recordingSession = null;
        throw new Error('Recorder not prepared');
      }

      await this.recorder.stopAndUnloadAsync();

      const uri = this.recorder.getURI();
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

      const status = await this.recorder.getStatusAsync();
      if (status.canRecord || status.isRecording) {
        await this.recorder.stopAndUnloadAsync();
        const uri = this.recorder.getURI();
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

      const status = await this.recorder.getStatusAsync();
      return (status.durationMillis || 0) / 1000; // 转换为秒
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
    const voiceOriginalRelative = 'media/voice/original/';
    // 绝对路径中包含 media/voice/original/，提取文件名重建
    if (uri.includes(voiceOriginalRelative)) {
      const filename = uri.split(voiceOriginalRelative).pop();
      if (filename) {
        return `${MEDIA_PATHS.voiceOriginal}${filename}`;
      }
    }
    // 纯文件名（相对路径），直接拼接
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
      .sort((a, b) => a[1] - b[1])[0][0];
    const oldSound = this.soundCache.get(lruKey);
    if (oldSound) {
      await oldSound.unloadAsync().catch(() => {});
    }
    this.soundCache.delete(lruKey);
    this.soundAccessTime.delete(lruKey);
  }

  /**
   * 加载音频到缓存并返回 Sound 实例
   */
  private static async loadToCache(uri: string): Promise<Audio.Sound> {
    let sound = this.soundCache.get(uri);
    if (!sound) {
      sound = new Audio.Sound();
      // progressUpdateIntervalMillis: 100 确保进度每 100ms 上报一次
      await sound.loadAsync({ uri }, { shouldPlay: false, progressUpdateIntervalMillis: 100 });
      await this.evictLruIfNeeded();
      this.soundCache.set(uri, sound);
    } else {
      // 缓存命中时也要确保更新间隔正确
      await sound.setStatusAsync({ progressUpdateIntervalMillis: 100 });
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
      // 修复旧绝对路径（沙盒 UUID 变化后路径失效）
      const resolvedUri = this.resolveAudioUri(uri);
      if (resolvedUri !== uri) {
        logger.log('[playAudio] uri resolved:', uri.slice(-30), '→', resolvedUri.slice(-30));
      }
      uri = resolvedUri;

      logger.log('[playAudio] ▶ called uri:', uri.slice(-30));
      logger.log('[playAudio] currentPlayingUri:', this.currentPlayingUri?.slice(-30) ?? 'null');

      // 文件不存在时提前退出，避免 expo-av 抛出 WARN
      const { exists } = await getFileInfo(uri);
      if (!exists) {
        logger.warn('[playAudio] File not found:', uri.slice(-50));
        throw this.createError('CODEC_ERROR', '音频文件不存在或已被删除');
      }

      // 如果正在播放同一个音频，直接返回
      if (this.currentPlayingUri === uri && this.sound) {
        const status = await this.sound.getStatusAsync();
        logger.log('[playAudio] same uri status:', JSON.stringify(status));
        if (status.isLoaded && status.isPlaying) {
          logger.log('[playAudio] already playing, return early');
          return;
        }
      }

      // 停止之前的播放，并通知旧卡片重置状态
      if (this.sound && this.currentPlayingUri !== uri) {
        logger.log('[playAudio] stopping previous sound');
        await this.sound.stopAsync();
        this.prevOnComplete?.();
        this.prevOnComplete = null;
        this.sound = null;
      }

      // 切换到播放模式
      await this.switchToPlaybackMode();

      // 从缓存获取或加载 Sound 实例
      const fromCache = this.soundCache.has(uri);
      logger.log('[playAudio] loadToCache fromCache:', fromCache);
      const sound = await this.loadToCache(uri);
      this.sound = sound;
      this.currentPlayingUri = uri;

      // 记录新的完成回调，供下次切换时调用
      this.prevOnComplete = onComplete || null;

      // 设置播放状态更新回调
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          logger.log('[playAudio] status NOT loaded, error:', (status as any).error);
          return;
        }
        if (onProgress && status.isPlaying) {
          onProgress(status.positionMillis);
        }
        if (status.didJustFinish) {
          logger.log('[playAudio] didJustFinish');
          this.currentPlayingUri = null;
          this.prevOnComplete = null;
          onComplete?.();
        }
      });

      // 回调注册后再设置进度更新间隔，确保回调能收到进度事件
      await this.sound.setStatusAsync({ progressUpdateIntervalMillis: 100 });

      // 从头开始播放
      await this.sound.setPositionAsync(0);
      logger.log('[playAudio] calling playAsync...');
      await this.sound.playAsync();
      logger.log('[playAudio] playAsync done');
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

      // 文件不存在时静默跳过，避免 expo-av 报错
      const { exists } = await getFileInfo(resolvedUri);
      if (!exists) {
        logger.warn('[VoiceService] Preload skipped, file not found:', resolvedUri.slice(-40));
        return;
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
      await this.sound.pauseAsync();
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
      await this.sound.stopAsync();
      // 不调用 unloadAsync：sound 实例可能在 soundCache 中，
      // unload 会使缓存失效，下次播放同一文件时报错
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
      if (!this.sound) {
        return false;
      }
      const status = await this.sound.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    } catch (error) {
      logger.error('Failed to check playback status:', error);
      return false;
    }
  }

  /**
   * 获取当前播放进度
   */
  static async getCurrentProgress(): Promise<{
    current: number;
    total: number;
  }> {
    try {
      if (!this.sound) {
        return { current: 0, total: 0 };
      }

      const status = await this.sound.getStatusAsync();
      const loaded = status.isLoaded ? status : null;
      return {
        current: (loaded?.positionMillis || 0) / 1000,
        total: (loaded?.durationMillis || 0) / 1000,
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
      // 这里简化处理，实际应该使用专门的音频编码库
      const { size: originalSize } = await getFileInfo(uri);

      // 获取压缩预设
      const preset = AUDIO_PRESETS[quality.toUpperCase() as keyof typeof AUDIO_PRESETS];

      // 为简化起见，只返回原始文件
      // 实际实现应该使用 ffmpeg 或类似工具进行压缩
      const compressedSize = Math.floor(
        originalSize * (preset.bitrate / 320)
      );

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

      const sound = new Audio.Sound();
      await sound.loadAsync({ uri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();
      const loaded = status.isLoaded ? status : null;
      return {
        duration: (loaded?.durationMillis || 0) / 1000,
        size,
      };
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
    try {
      // 检查存储空间
      const { size } = await getFileInfo(sourceUri);
      if (size > STORAGE_QUOTA.MAX_AUDIO_SIZE) {
        throw this.createError(
          'DEVICE_STORAGE_FULL',
          ERROR_MESSAGES.FILE_TOO_LARGE
        );
      }

      // 保存到存储
      const filename = generateUniqueFilename(entryId, 'voice', 'm4a');
      const targetUri = `${MEDIA_PATHS.voiceOriginal}${filename}`;

      // 确保目录存在
      const dirInfo = await FileSystem.getInfoAsync(MEDIA_PATHS.voiceOriginal);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MEDIA_PATHS.voiceOriginal, {
          intermediates: true,
        });
      }

      // 复制文件
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri,
      });

      return targetUri;
    } catch (error) {
      if ((error as any)?.code) {
        throw error; // 已是 MediaError，直接透传
      }
      logger.error('Failed to save voice:', error);
      throw this.createError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.STORAGE_FULL);
    }
  }

  /**
   * 清除音频缓存
   */
  static async clearSoundCache(): Promise<void> {
    for (const [, sound] of this.soundCache) {
      await sound.unloadAsync().catch(() => {});
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

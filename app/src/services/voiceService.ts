/**
 * 语音服务
 * 处理录音、播放、压缩、存储等语音相关操作
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera } from 'expo-camera';
import {
  AUDIO_PRESETS,
  STORAGE_QUOTA,
  ERROR_MESSAGES,
} from '@/src/utils/constants';
import {
  MEDIA_PATHS,
  generateUniqueFilename,
  fileExists,
  deleteFile,
  getFileInfo,
} from '@/src/utils/fileSystem';
import { MediaError, AudioCompressionOptions } from '@/src/types/entry';

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
  private static currentPlayingUri: string | null = null;

  /**
   * 初始化音频系统为录音模式
   */
  static async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpiece: false,
      });
      this.isAudioInitialized = true;
      this.currentAudioMode = 'recording';
    } catch (error) {
      console.error('Failed to initialize audio:', error);
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
        playThroughEarpiece: false,
      });
      this.currentAudioMode = 'recording';
      console.log('[VoiceService] Switched to recording mode');
    } catch (error) {
      console.error('Failed to switch to recording mode:', error);
    }
  }

  /**
   * 切换到播放模式
   */
  static async switchToPlaybackMode(): Promise<void> {
    if (this.currentAudioMode === 'playback') {
      return; // 已经是播放模式，无需切换
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.currentAudioMode = 'playback';
      console.log('[VoiceService] Switched to playback mode');
    } catch (error) {
      console.error('Failed to switch to playback mode:', error);
    }
  }

  /**
   * 预初始化音频系统（用于提前准备）
   * 静默失败，不抛出错误
   */
  static async prewarmAudioSystem(): Promise<void> {
    try {
      console.log('[VoiceService] Starting audio system prewarm...');

      // 检查权限状态（不弹窗）
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        console.log('[VoiceService] Microphone permission not granted, skipping prewarm');
        return;
      }

      // 预初始化音频系统
      if (!this.isAudioInitialized) {
        await this.initializeAudio();
        console.log('[VoiceService] Audio system prewarmed successfully');
      } else {
        console.log('[VoiceService] Audio system already initialized');
      }
    } catch (error) {
      console.error('[VoiceService] Failed to prewarm audio system:', error);
      // 静默失败，不影响用户
    }
  }

  /**
   * 检查麦克风权限状态（不弹窗）
   */
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const { status } = await Camera.getMicrophonePermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check microphone permission:', error);
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
      const { granted } = await Camera.requestMicrophonePermissionsAsync();
      return granted;
    } catch (error) {
      console.error('Failed to ensure microphone permission:', error);
      return false;
    }
  }

  /**
   * 请求麦克风权限
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const { granted } = await Camera.requestMicrophonePermissionsAsync();
      return granted;
    } catch (error) {
      console.error('Failed to request microphone permission:', error);
      throw this.createError(
        'PERMISSION_DENIED',
        ERROR_MESSAGES.MICROPHONE_ERROR
      );
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
      console.error('Failed to start recording:', error);
      if (error instanceof MediaError) {
        throw error;
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
      console.error('Failed to pause recording:', error);
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
      await this.recorder.resumeAsync();
    } catch (error) {
      console.error('Failed to resume recording:', error);
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

      // 先获取状态（在停止之前）
      const status = await this.recorder.getStatusAsync();
      const duration = (status.durationMillis || 0) / 1000; // 转换为秒

      // 然后停止并卸载
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
      console.error('Failed to stop recording:', error);
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

      await this.recorder.stopAndUnloadAsync();
      const uri = this.recorder.getURI();
      if (uri) {
        await deleteFile(uri);
      }

      this.recorder = null;
      this.recordingSession = null;
    } catch (error) {
      console.error('Failed to cancel recording:', error);
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
      console.error('Failed to get recording duration:', error);
      return 0;
    }
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
      // 如果正在播放同一个音频，直接返回
      if (this.currentPlayingUri === uri && this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          return;
        }
      }

      // 停止之前的播放
      if (this.sound && this.currentPlayingUri !== uri) {
        await this.sound.stopAsync();
        this.sound = null;
      }

      // 切换到播放模式（优化：使用新的切换方法）
      await this.switchToPlaybackMode();

      // 尝试从缓存获取 Sound 实例
      let sound = this.soundCache.get(uri);

      if (!sound) {
        // 创建新的 Sound 实例并预加载
        sound = new Audio.Sound();
        await sound.loadAsync({ uri }, { shouldPlay: false });

        // 缓存 Sound 实例（最多缓存 5 个）
        if (this.soundCache.size >= 5) {
          // 删除最旧的缓存
          const firstKey = this.soundCache.keys().next().value;
          const oldSound = this.soundCache.get(firstKey);
          if (oldSound) {
            await oldSound.unloadAsync().catch(() => {});
          }
          this.soundCache.delete(firstKey);
        }
        this.soundCache.set(uri, sound);
      }

      this.sound = sound;
      this.currentPlayingUri = uri;

      // 设置播放状态更新回调
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          // 更新播放进度
          if (status.isPlaying && onProgress) {
            onProgress(status.positionMillis);
          }

          // 播放完成
          if (status.didJustFinish) {
            this.currentPlayingUri = null;
            onComplete?.();
          }
        }
      });

      // 从头开始播放
      await this.sound.setPositionAsync(0);
      await this.sound.playAsync();
    } catch (error) {
      console.error('Failed to play audio:', error);
      this.currentPlayingUri = null;
      throw this.createError('CODEC_ERROR', ERROR_MESSAGES.CODEC_ERROR);
    }
  }

  /**
   * 预加载音频（在后台加载，不播放）
   */
  static async preloadAudio(uri: string): Promise<void> {
    try {
      // 如果已经缓存，直接返回
      if (this.soundCache.has(uri)) {
        return;
      }

      // 切换到播放模式（优化：使用新的切换方法）
      await this.switchToPlaybackMode();

      // 创建并预加载 Sound 实例
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri }, { shouldPlay: false });

      // 缓存 Sound 实例
      if (this.soundCache.size >= 5) {
        const firstKey = this.soundCache.keys().next().value;
        const oldSound = this.soundCache.get(firstKey);
        if (oldSound) {
          await oldSound.unloadAsync().catch(() => {});
        }
        this.soundCache.delete(firstKey);
      }
      this.soundCache.set(uri, sound);

      console.log('[VoiceService] Audio preloaded:', uri);
    } catch (error) {
      console.error('[VoiceService] Failed to preload audio:', error);
      // 预加载失败不抛出错误，只记录日志
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
      console.error('Failed to pause playback:', error);
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
      await this.sound.unloadAsync();
      this.sound = null;
    } catch (error) {
      console.error('Failed to stop playback:', error);
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
      console.error('Failed to check playback status:', error);
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
      return {
        current: (status.positionMillis || 0) / 1000,
        total: (status.durationMillis || 0) / 1000,
      };
    } catch (error) {
      console.error('Failed to get playback progress:', error);
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
      console.error('Failed to compress audio:', error);
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

      return {
        duration: (status.durationMillis || 0) / 1000,
        size,
      };
    } catch (error) {
      console.error('Failed to get audio metadata:', error);
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
      console.error('Failed to delete audio:', error);
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
      if (error instanceof MediaError) {
        throw error;
      }
      console.error('Failed to save voice:', error);
      throw this.createError('DEVICE_STORAGE_FULL', ERROR_MESSAGES.STORAGE_FULL);
    }
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
 * 语音相关的 Hook
 */
export function useVoiceEntry() {
  const startRecording = async () => {
    try {
      return await VoiceService.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  };

  const stopRecording = async () => {
    try {
      return await VoiceService.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  };

  const playAudio = async (uri: string) => {
    try {
      return await VoiceService.playAudio(uri);
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  };

  const saveVoice = async (
    uri: string,
    entryId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      return await VoiceService.saveVoiceToStorage(uri, entryId, quality);
    } catch (error) {
      console.error('Failed to save voice:', error);
      throw error;
    }
  };

  return {
    startRecording,
    stopRecording,
    playAudio,
    saveVoice,
  };
}

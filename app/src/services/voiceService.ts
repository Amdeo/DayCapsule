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

  /**
   * 初始化音频系统
   */
  static async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpiece: false,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
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
      // 检查权限
      const granted = await this.requestMicrophonePermission();
      if (!granted) {
        throw this.createError(
          'PERMISSION_DENIED',
          ERROR_MESSAGES.MICROPHONE_ERROR
        );
      }

      // 初始化音频
      await this.initializeAudio();

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

      await this.recorder.stopAndUnloadAsync();

      const uri = this.recorder.getURI();
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      const { size } = await getFileInfo(uri);
      const status = await this.recorder.getStatusAsync();
      const duration = (status.durationMillis || 0) / 1000; // 转换为秒

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
   * 播放音频
   */
  static async playAudio(uri: string): Promise<void> {
    try {
      // 停止之前的播放
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // 创建新的 Sound 实例
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri });
      await this.sound.playAsync();
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw this.createError('CODEC_ERROR', ERROR_MESSAGES.CODEC_ERROR);
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

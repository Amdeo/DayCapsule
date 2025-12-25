import { Platform, Alert } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import RNFS from 'react-native-fs';
import { v4 as uuidv4 } from 'uuid';

export interface RecordingOptions {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  audioSource?: number;
  outputFormat?: number;
  encoder?: number;
  duration?: number; // 最大录制时长（秒）
  maxFileSize?: number; // 最大文件大小（字节）
}

export interface RecordingResult {
  uri: string;
  fileName: string;
  fileSize: number;
  duration: number; // 录制时长（毫秒）
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

export interface PlaybackResult {
  currentPosition: number;
  duration: number;
  isPlaying: boolean;
}

class AudioRecorderService {
  private audioRecorderPlayer: AudioRecorderPlayer;
  private isRecording = false;
  private recordingStartTime = 0;
  private currentFileName = '';

  private readonly MICROPHONE_PERMISSION = Platform.select({
    ios: PERMISSIONS.IOS.MICROPHONE,
    android: PERMISSIONS.ANDROID.RECORD_AUDIO,
  });

  constructor() {
    this.audioRecorderPlayer = new AudioRecorderPlayer();
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.audioRecorderPlayer.setRecordInterval((data) => {
      // 录音进度回调
      console.log('录音进度:', data.currentPosition);
    });

    this.audioRecorderPlayer.setRecordBackThreshold((data) => {
      // 音量回调
      console.log('录音音量:', data.currentVolume);
    });
  }

  /**
   * 检查麦克风权限
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const permission = await request(this.MICROPHONE_PERMISSION!);
      return permission === RESULTS.GRANTED;
    } catch (error) {
      console.error('检查麦克风权限失败:', error);
      return false;
    }
  }

  /**
   * 请求录音权限
   */
  async requestRecordingPermission(): Promise<boolean> {
    const hasPermission = await this.checkMicrophonePermission();
    
    if (!hasPermission) {
      Alert.alert(
        '需要麦克风权限',
        '应用需要访问麦克风来录制语音。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '去设置',
            onPress: () => {
              // 在实际应用中，这里会打开系统设置
              // Linking.openSettings();
            },
          },
        ]
      );
    }

    return hasPermission;
  }

  /**
   * 开始录音
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (this.isRecording) {
      throw new Error('已经在录音中');
    }

    // 检查权限
    const hasPermission = await this.requestRecordingPermission();
    if (!hasPermission) {
      throw new Error('没有录音权限');
    }

    try {
      const defaultOptions: RecordingOptions = {
        sampleRate: 44100,
        channels: 2,
        bitsPerSample: 16,
        audioSource: 6, // MIC
        outputFormat: 1, // M4A
        encoder: 1, // AAC
        duration: 300, // 5分钟最大录制时长
        maxFileSize: 50 * 1024 * 1024, // 50MB
      };

      const recordingOptions = { ...defaultOptions, ...options };
      
      // 生成文件名
      this.currentFileName = `recording_${Date.now()}_${uuidv4()}.m4a`;
      const path = `${RNFS.DocumentDirectoryPath}/recordings/${this.currentFileName}`;

      // 确保录音目录存在
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/recordings`).catch(() => {});

      // 开始录音
      const result = await this.audioRecorderPlayer.startRecorder(
        path,
        recordingOptions
      );

      this.isRecording = true;
      this.recordingStartTime = Date.now();

      console.log('开始录音:', result);
    } catch (error) {
      console.error('开始录音失败:', error);
      throw error;
    }
  }

  /**
   * 停止录音
   */
  async stopRecording(): Promise<RecordingResult> {
    if (!this.isRecording) {
      throw new Error('没有正在进行的录音');
    }

    try {
      const result = await this.audioRecorderPlayer.stopRecorder();
      
      this.isRecording = false;
      const duration = Date.now() - this.recordingStartTime;

      // 获取文件信息
      const filePath = `${RNFS.DocumentDirectoryPath}/recordings/${this.currentFileName}`;
      const fileInfo = await RNFS.stat(filePath);

      const recordingResult: RecordingResult = {
        uri: filePath,
        fileName: this.currentFileName,
        fileSize: fileInfo.size,
        duration: duration,
        sampleRate: 44100, // 从实际录音器获取
        channels: 2,
        bitsPerSample: 16,
      };

      console.log('停止录音:', result);
      return recordingResult;
    } catch (error) {
      this.isRecording = false;
      console.error('停止录音失败:', error);
      throw error;
    }
  }

  /**
   * 暂停录音
   */
  async pauseRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('没有正在进行的录音');
    }

    try {
      await this.audioRecorderPlayer.pauseRecorder();
    } catch (error) {
      console.error('暂停录音失败:', error);
      throw error;
    }
  }

  /**
   * 恢复录音
   */
  async resumeRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('没有正在进行的录音');
    }

    try {
      await this.audioRecorderPlayer.resumeRecorder();
    } catch (error) {
      console.error('恢复录音失败:', error);
      throw error;
    }
  }

  /**
   * 开始播放音频
   */
  async startPlayback(audioPath?: string): Promise<PlaybackResult> {
    try {
      const path = audioPath || `${RNFS.DocumentDirectoryPath}/recordings/${this.currentFileName}`;
      
      const result = await this.audioRecorderPlayer.startPlayer(path);
      
      // 监听播放进度
      this.audioRecorderPlayer.setPlayerSubscriptionInterval((data) => {
        console.log('播放进度:', data.currentPosition);
      });

      return {
        currentPosition: 0,
        duration: result.duration || 0,
        isPlaying: true,
      };
    } catch (error) {
      console.error('开始播放失败:', error);
      throw error;
    }
  }

  /**
   * 暂停播放
   */
  async pausePlayback(): Promise<void> {
    try {
      await this.audioRecorderPlayer.pausePlayer();
    } catch (error) {
      console.error('暂停播放失败:', error);
      throw error;
    }
  }

  /**
   * 停止播放
   */
  async stopPlayback(): Promise<void> {
    try {
      await this.audioRecorderPlayer.stopPlayer();
    } catch (error) {
      console.error('停止播放失败:', error);
      throw error;
    }
  }

  /**
   * 跳转到指定位置
   */
  async seekTo(position: number): Promise<void> {
    try {
      await this.audioRecorderPlayer.seekToPlayer(position);
    } catch (error) {
      console.error('跳转失败:', error);
      throw error;
    }
  }

  /**
   * 设置音量
   */
  async setVolume(volume: number): Promise<void> {
    try {
      await this.audioRecorderPlayer.setVolume(volume);
    } catch (error) {
      console.error('设置音量失败:', error);
      throw error;
    }
  }

  /**
   * 获取录音状态
   */
  getRecordingState(): {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    fileName: string;
  } {
    return {
      isRecording: this.isRecording,
      isPaused: false, // 简化实现，实际需要状态管理
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      fileName: this.currentFileName,
    };
  }

  /**
   * 获取录音文件列表
   */
  async getRecordingFiles(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    created: Date;
    duration?: number;
  }>> {
    try {
      const recordingsDir = `${RNFS.DocumentDirectoryPath}/recordings`;
      const files = await RNFS.readDir(recordingsDir);

      const fileList = await Promise.all(
        files.map(async (file) => {
          const stats = await RNFS.stat(file.path);
          return {
            name: file.name,
            path: file.path,
            size: stats.size,
            created: stats.mtime,
            duration: undefined, // 实际应用中可以从文件元数据获取
          };
        })
      );

      return fileList.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error('获取录音文件列表失败:', error);
      return [];
    }
  }

  /**
   * 删除录音文件
   */
  async deleteRecording(fileName: string): Promise<void> {
    try {
      const filePath = `${RNFS.DocumentDirectoryPath}/recordings/${fileName}`;
      await RNFS.unlink(filePath);
    } catch (error) {
      console.error('删除录音文件失败:', error);
      throw error;
    }
  }

  /**
   * 清理所有录音文件
   */
  async cleanupAllRecordings(): Promise<void> {
    try {
      const files = await this.getRecordingFiles();
      
      await Promise.all(
        files.map(file => this.deleteRecording(file.name))
      );

      console.log('清理了所有录音文件');
    } catch (error) {
      console.error('清理录音文件失败:', error);
      throw error;
    }
  }

  /**
   * 移动录音文件到其他目录
   */
  async moveRecording(fileName: string, destinationPath: string): Promise<void> {
    try {
      const sourcePath = `${RNFS.DocumentDirectoryPath}/recordings/${fileName}`;
      await RNFS.moveFile(sourcePath, destinationPath);
    } catch (error) {
      console.error('移动录音文件失败:', error);
      throw error;
    }
  }

  /**
   * 复制录音文件
   */
  async copyRecording(fileName: string, destinationPath: string): Promise<void> {
    try {
      const sourcePath = `${RNFS.DocumentDirectoryPath}/recordings/${fileName}`;
      await RNFS.copyFile(sourcePath, destinationPath);
    } catch (error) {
      console.error('复制录音文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取录音文件信息
   */
  async getRecordingInfo(fileName: string): Promise<{
    size: number;
    duration: number;
    sampleRate: number;
    format: string;
  } | null> {
    try {
      const filePath = `${RNFS.DocumentDirectoryPath}/recordings/${fileName}`;
      const stats = await RNFS.stat(filePath);

      // 实际应用中，这里会解析音频文件头获取详细信息
      // 现在返回基本信息
      return {
        size: stats.size,
        duration: 0, // 需要解析文件获取
        sampleRate: 44100, // 默认值
        format: 'm4a',
      };
    } catch (error) {
      console.error('获取录音文件信息失败:', error);
      return null;
    }
  }

  /**
   * 检查录音器是否可用
   */
  isRecorderAvailable(): boolean {
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }

  /**
   * 释放资源
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isRecording) {
        await this.stopRecording();
      }
      await this.stopPlayback();
      this.audioRecorderPlayer.removeRecordInterval();
      this.audioRecorderPlayer.removePlayerSubscriptionInterval();
    } catch (error) {
      console.error('清理资源失败:', error);
    }
  }
}

// 单例实例
export const audioRecorderService = new AudioRecorderService();
export default audioRecorderService;

import {NativeModules, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {logger} from '@services/telemetry/logger';

const {AudioRecorderModule} = NativeModules;

export interface AudioRecorderConfig {
  minDuration?: number; // 最小录音时长（毫秒），默认 1000ms
  maxDuration?: number; // 最大录音时长（毫秒），默认 300000ms (5分钟)
  sampleRate?: number; // 采样率，默认 16000
  channels?: number; // 声道数，默认 1 (单声道)
  bitRate?: number; // 比特率，默认 128000
}

class AudioRecorder {
  private isRecordingFlag = false;
  private isPausedFlag = false;
  private recordingStartTime = 0;
  private pausedTime = 0;
  private currentAudioPath: string | null = null;
  private config: Required<AudioRecorderConfig>;

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      minDuration: config.minDuration ?? 1000,
      maxDuration: config.maxDuration ?? 300000,
      sampleRate: config.sampleRate ?? 16000,
      channels: config.channels ?? 1,
      bitRate: config.bitRate ?? 128000,
    };
  }

  async startRecording(): Promise<boolean> {
    try {
      if (this.isRecordingFlag) {
        logger.warn('Recording already in progress');
        return false;
      }

      // 生成音频文件路径
      const timestamp = Date.now();
      const audioDir = `${RNFS.DocumentDirectoryPath}/audio`;
      await RNFS.mkdir(audioDir, {NSURLIsExcludedFromBackupKey: true});
      this.currentAudioPath = `${audioDir}/recording_${timestamp}.m4a`;

      // 启动原生录音
      const result = await AudioRecorderModule.startRecording({
        path: this.currentAudioPath,
        sampleRate: this.config.sampleRate,
        channels: this.config.channels,
        bitRate: this.config.bitRate,
      });

      if (result) {
        this.isRecordingFlag = true;
        this.recordingStartTime = Date.now();
        this.pausedTime = 0;
        logger.info('Recording started', {path: this.currentAudioPath});
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to start recording', {error});
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.isRecordingFlag) {
        logger.warn('No recording in progress');
        return null;
      }

      const recordingDuration = this.getRecordingDuration();

      // 检查最小时长
      if (recordingDuration < this.config.minDuration) {
        logger.warn('Recording duration too short', {
          duration: recordingDuration,
          minDuration: this.config.minDuration,
        });
        await AudioRecorderModule.cancelRecording();
        this.isRecordingFlag = false;
        return null;
      }

      // 停止录音
      const result = await AudioRecorderModule.stopRecording();

      if (result) {
        this.isRecordingFlag = false;
        this.isPausedFlag = false;
        const audioPath = this.currentAudioPath;
        this.currentAudioPath = null;

        logger.info('Recording stopped', {
          path: audioPath,
          duration: recordingDuration,
        });

        return audioPath;
      }

      return null;
    } catch (error) {
      logger.error('Failed to stop recording', {error});
      return null;
    }
  }

  async pauseRecording(): Promise<boolean> {
    try {
      if (!this.isRecordingFlag || this.isPausedFlag) {
        logger.warn('Cannot pause recording');
        return false;
      }

      const result = await AudioRecorderModule.pauseRecording();

      if (result) {
        this.isPausedFlag = true;
        this.pausedTime = Date.now();
        logger.info('Recording paused');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to pause recording', {error});
      return false;
    }
  }

  async resumeRecording(): Promise<boolean> {
    try {
      if (!this.isRecordingFlag || !this.isPausedFlag) {
        logger.warn('Cannot resume recording');
        return false;
      }

      const result = await AudioRecorderModule.resumeRecording();

      if (result) {
        this.isPausedFlag = false;
        // 调整开始时间以排除暂停时间
        const pauseDuration = Date.now() - this.pausedTime;
        this.recordingStartTime += pauseDuration;
        logger.info('Recording resumed');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to resume recording', {error});
      return false;
    }
  }

  async cancelRecording(): Promise<boolean> {
    try {
      if (!this.isRecordingFlag) {
        return false;
      }

      const result = await AudioRecorderModule.cancelRecording();

      if (result) {
        this.isRecordingFlag = false;
        this.isPausedFlag = false;
        this.currentAudioPath = null;
        logger.info('Recording cancelled');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to cancel recording', {error});
      return false;
    }
  }

  isRecording(): boolean {
    return this.isRecordingFlag;
  }

  isPaused(): boolean {
    return this.isPausedFlag;
  }

  getRecordingDuration(): number {
    if (!this.isRecordingFlag) {
      return 0;
    }

    const now = Date.now();
    const totalDuration = now - this.recordingStartTime;

    // 如果超过最大时长，自动停止
    if (totalDuration > this.config.maxDuration) {
      this.stopRecording();
      return this.config.maxDuration;
    }

    return totalDuration;
  }

  getCurrentAudioPath(): string | null {
    return this.currentAudioPath;
  }

  setConfig(config: Partial<AudioRecorderConfig>): void {
    this.config = {...this.config, ...config};
    logger.info('Audio recorder config updated', {config: this.config});
  }

  getConfig(): Required<AudioRecorderConfig> {
    return {...this.config};
  }
}

export const audioRecorder = new AudioRecorder();


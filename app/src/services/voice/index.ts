/**
 * 语音录制服务
 * 封装语音录制和播放功能
 */

import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {Platform} from 'react-native';
import {permissionsService} from '@services/permissions';
import {logger} from '@services/telemetry/logger';
import {performanceMonitor} from '@services/telemetry/performance';

export interface VoiceRecording {
  uri: string;
  duration: number;
  fileSize: number;
}

export interface RecordingStatus {
  isRecording: boolean;
  currentPosition: number;
  currentMetering?: number;
}

class VoiceService {
  private audioRecorderPlayer: any;
  private recordingPath: string = '';
  private isRecording: boolean = false;

  constructor() {
    this.audioRecorderPlayer = AudioRecorderPlayer;
  }

  /**
   * 开始录音
   */
  async startRecording(): Promise<string | null> {
    const timerId = performanceMonitor.start('voice_start_recording');

    try {
      // 检查麦克风权限
      const hasPermission = await permissionsService.ensurePermission('microphone');
      if (!hasPermission) {
        logger.warn('Microphone permission denied');
        performanceMonitor.end(timerId, {success: false, reason: 'permission_denied'});
        return null;
      }

      // 配置录音参数
      const path = Platform.select({
        ios: `voice_${Date.now()}.m4a`,
        android: `sdcard/voice_${Date.now()}.mp4`,
      });

      const audioSet = {
        AudioEncoderAndroid: 3, // AAC
        AudioSourceAndroid: 1, // MIC
        AVEncoderAudioQualityKeyIOS: 2, // high
        AVNumberOfChannelsKeyIOS: 2,
        AVFormatIDKeyIOS: 'aac',
      };

      const uri = await this.audioRecorderPlayer.startRecorder(path, audioSet);
      this.recordingPath = uri;
      this.isRecording = true;

      // 设置录音进度监听
      this.audioRecorderPlayer.addRecordBackListener(e => {
        logger.debug('Recording progress', {
          currentPosition: e.currentPosition,
          currentMetering: e.currentMetering,
        });
      });

      performanceMonitor.end(timerId, {success: true});
      logger.info('Recording started', {path: uri});

      return uri;
    } catch (error) {
      performanceMonitor.end(timerId, {success: false, error: true});
      logger.error('Failed to start recording', error);
      return null;
    }
  }

  /**
   * 停止录音
   */
  async stopRecording(): Promise<VoiceRecording | null> {
    const timerId = performanceMonitor.start('voice_stop_recording');

    try {
      if (!this.isRecording) {
        logger.warn('No recording in progress');
        return null;
      }

      const result = await this.audioRecorderPlayer.stopRecorder();
      this.audioRecorderPlayer.removeRecordBackListener();
      this.isRecording = false;

      performanceMonitor.end(timerId, {success: true});
      logger.info('Recording stopped', {path: result});

      // 获取录音信息
      const recording: VoiceRecording = {
        uri: result,
        duration: 0, // 需要从录音进度中获取
        fileSize: 0, // 需要从文件系统获取
      };

      return recording;
    } catch (error) {
      performanceMonitor.end(timerId, {success: false, error: true});
      logger.error('Failed to stop recording', error);
      this.isRecording = false;
      return null;
    }
  }

  /**
   * 取消录音
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        await this.audioRecorderPlayer.stopRecorder();
        this.audioRecorderPlayer.removeRecordBackListener();
        this.isRecording = false;
        logger.info('Recording cancelled');
      }
    } catch (error) {
      logger.error('Failed to cancel recording', error);
    }
  }

  /**
   * 播放录音
   */
  async playRecording(uri: string): Promise<void> {
    const timerId = performanceMonitor.start('voice_play_recording');

    try {
      await this.audioRecorderPlayer.startPlayer(uri);

      // 设置播放进度监听
      this.audioRecorderPlayer.addPlayBackListener(e => {
        if (e.currentPosition === e.duration) {
          this.stopPlaying();
        }
      });

      performanceMonitor.end(timerId, {success: true});
      logger.info('Playing recording', {uri});
    } catch (error) {
      performanceMonitor.end(timerId, {success: false, error: true});
      logger.error('Failed to play recording', error);
    }
  }

  /**
   * 停止播放
   */
  async stopPlaying(): Promise<void> {
    try {
      await this.audioRecorderPlayer.stopPlayer();
      this.audioRecorderPlayer.removePlayBackListener();
      logger.info('Playback stopped');
    } catch (error) {
      logger.error('Failed to stop playback', error);
    }
  }

  /**
   * 暂停播放
   */
  async pausePlaying(): Promise<void> {
    try {
      await this.audioRecorderPlayer.pausePlayer();
      logger.info('Playback paused');
    } catch (error) {
      logger.error('Failed to pause playback', error);
    }
  }

  /**
   * 恢复播放
   */
  async resumePlaying(): Promise<void> {
    try {
      await this.audioRecorderPlayer.resumePlayer();
      logger.info('Playback resumed');
    } catch (error) {
      logger.error('Failed to resume playback', error);
    }
  }

  /**
   * 获取录音状态
   */
  getRecordingStatus(): boolean {
    return this.isRecording;
  }

  /**
   * 格式化时间（毫秒转为 mm:ss）
   */
  formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.audioRecorderPlayer.removeRecordBackListener();
    this.audioRecorderPlayer.removePlayBackListener();
    logger.info('VoiceService disposed');
  }
}

export const voiceService = new VoiceService();

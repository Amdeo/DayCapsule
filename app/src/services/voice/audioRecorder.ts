import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {logger} from '@services/telemetry/logger';
import {performanceMonitor} from '@services/telemetry/performance';

export interface AudioRecorderConfig {
  minDuration?: number;
  maxDuration?: number;
}

// Stub implementation for AudioRecorderPlayer
class AudioRecorderPlayerStub {
  setSubscriptionDuration(_duration: number) {}
  async startRecorder(_path: string, _options?: any) { return ''; }
  async stopRecorder() { return ''; }
  removeRecordBackListener() {}
}

class AudioRecorder {
  private audioRecorderPlayer: AudioRecorderPlayerStub;
  private isRecordingFlag = false;
  private isPausedFlag = false;
  private currentAudioPath: string | null = null;
  private recordingStartTime = 0;
  private recordingDuration: number = 0;
  private pausedAt: number = 0;
  private config: Required<AudioRecorderConfig>;

  constructor(config: AudioRecorderConfig = {}) {
    this.audioRecorderPlayer = new AudioRecorderPlayerStub();
    this.config = {
      minDuration: config.minDuration ?? 1000,
      maxDuration: config.maxDuration ?? 300000,
    };
  }

  async startRecording(): Promise<boolean> {
    if (this.isRecordingFlag) return false;

    const timestamp = Date.now();
    const audioDir = `${RNFS.DocumentDirectoryPath}/audio`;
    
    try {
      if (!(await RNFS.exists(audioDir))) {
        await RNFS.mkdir(audioDir);
      }
      
      const fileName = `recording_${timestamp}.m4a`;
      this.currentAudioPath = `${audioDir}/${fileName}`;

      // react-native-audio-recorder-player path logic
      // Android: needs full path (file://...)
      // iOS: just filename or uri
      const path = Platform.select({
        ios: fileName, 
        android: this.currentAudioPath,
      });

      const result = await this.audioRecorderPlayer.startRecorder(path);

      this.isRecordingFlag = true;
      this.recordingStartTime = Date.now();
      performanceMonitor.startMeasure('audio_recording_duration'); // Start measuring
      logger.info('Recording started', {path: this.currentAudioPath, result});
      return true;

    } catch (error) {
      logger.error('Failed to start recording', {error});
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.isRecordingFlag) return null;

    try {
      const result = await this.audioRecorderPlayer.stopRecorder();
      this.audioRecorderPlayer.removeRecordBackListener();
      this.isRecordingFlag = false;
      
      this.recordingDuration = Date.now() - this.recordingStartTime; // Calculate duration
      performanceMonitor.endMeasure('audio_recording_duration'); // End measuring

      if (this.recordingDuration < this.config.minDuration) {
        logger.warn('Recording too short', {duration: this.recordingDuration});
        // Optionally delete the file if too short
        if (this.currentAudioPath && await RNFS.exists(this.currentAudioPath)) {
          await RNFS.unlink(this.currentAudioPath);
          this.currentAudioPath = null;
        }
        return null;
      }

      logger.info('Recording stopped', {path: this.currentAudioPath, duration: this.recordingDuration});
      return this.currentAudioPath;

    } catch (error) {
      logger.error('Failed to stop recording', {error});
      return null;
    }
  }

  async cancelRecording(): Promise<boolean> {
    const result = await this.stopRecording();
    if (result && await RNFS.exists(result)) {
        await RNFS.unlink(result);
        logger.info('Recording cancelled and file deleted');
    }
    return true;
  }

  isRecording() {
    return this.isRecordingFlag;
  }

  // New method to get last recording duration
  getLastRecordingDuration(): number {
    return this.recordingDuration;
  }

  // Add pauseRecording method
  async pauseRecording(): Promise<boolean> {
    if (!this.isRecordingFlag || this.isPausedFlag) {
      return false;
    }

    try {
      this.isPausedFlag = true;
      this.pausedAt = Date.now();
      // Note: react-native-audio-recorder-player doesn't have a direct pause API
      // This is a stub implementation
      logger.info('Recording paused');
      return true;
    } catch (error) {
      logger.error('Failed to pause recording', {error});
      return false;
    }
  }

  // Add resumeRecording method
  async resumeRecording(): Promise<boolean> {
    if (!this.isRecordingFlag || !this.isPausedFlag) {
      return false;
    }

    try {
      this.isPausedFlag = false;
      // Adjust start time to account for pause duration
      this.recordingStartTime += Date.now() - this.pausedAt;
      logger.info('Recording resumed');
      return true;
    } catch (error) {
      logger.error('Failed to resume recording', {error});
      return false;
    }
  }

  // Add isPaused getter
  isPaused(): boolean {
    return this.isPausedFlag;
  }

  // Add getRecordingDuration method (alias for getLastRecordingDuration)
  getRecordingDuration(): number {
    if (this.isRecordingFlag && !this.isPausedFlag) {
      return Date.now() - this.recordingStartTime;
    }
    return this.recordingDuration;
  }
}

export const audioRecorder = new AudioRecorder();
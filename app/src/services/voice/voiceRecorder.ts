import {
  AudioModule,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';
import { ERROR_MESSAGES } from '@/src/utils/constants';
import { deleteFile, getFileInfo } from '@/src/utils/fileSystem';
import { MediaError } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import type { AudioFile } from './voiceStorage';

export interface RecordingSession {
  id: string;
  startTime: number;
  uri?: string;
  duration: number;
}

export class VoiceRecorder {
  private static recorder: AudioRecorder | null = null;
  private static recordingSession: RecordingSession | null = null;
  private static isAudioInitialized = false;
  private static currentAudioMode: 'recording' | 'playback' | null = null;

  static async initializeAudio(): Promise<void> {
    try {
      await this.setRecordingAudioMode();
      this.isAudioInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize audio:', error);
    }
  }

  static async switchToRecordingMode(): Promise<void> {
    if (this.currentAudioMode === 'recording') {
      return;
    }

    try {
      await this.setRecordingAudioMode();
      logger.log('[VoiceService] Switched to recording mode');
    } catch (error) {
      logger.error('Failed to switch to recording mode:', error);
    }
  }

  static markPlaybackMode(): void {
    this.currentAudioMode = 'playback';
  }

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

  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const { granted } = await getRecordingPermissionsAsync();
      return granted;
    } catch (error) {
      logger.error('Failed to check microphone permission:', error);
      return false;
    }
  }

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

  static async stopRecording(): Promise<AudioFile> {
    try {
      if (!this.recorder) {
        throw new Error('No active recording');
      }

      const recorder = this.recorder;
      const status = recorder.getStatus();
      let finalStatus = status;

      if (!status.canRecord && !status.isRecording) {
        logger.warn('[stopRecording] recorder already stopped, finalizing existing file');
      } else {
        await recorder.stop();
        finalStatus = recorder.getStatus();
      }

      this.recorder = null;
      this.recordingSession = null;

      const durationMillis = Math.max(status.durationMillis || 0, finalStatus.durationMillis || 0);
      const uri = recorder.uri || finalStatus.url || status.url;
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      const { size } = await getFileInfo(uri);

      return {
        uri,
        size,
        duration: durationMillis / 1000,
        mimeType: 'audio/m4a',
      };
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      throw this.createError('DEVICE_ERROR', ERROR_MESSAGES.DEVICE_ERROR);
    }
  }

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

  private static async setRecordingAudioMode(): Promise<void> {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionModeAndroid: 'duckOthers',
    });
    this.currentAudioMode = 'recording';
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {audioStorage} from '@services/storage/audioStorage';
import {asrService} from '@services/ai/asrService';
import {databaseService} from '@services/storage/database';
import {networkMonitor} from '@services/sync/networkMonitor';
import {logger} from '@services/telemetry/logger';

export interface CachedRecording {
  id: string;
  audioPath: string;
  transcript?: string;
  confidence?: number;
  createdAt: number;
  isTranscribed: boolean;
  isSynced: boolean;
}

const CACHE_KEY = '@memorycapsule_offline_recordings';

class OfflineRecordingCache {
  private cache: Map<string, CachedRecording> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // 从 AsyncStorage 加载缓存
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const recordings = JSON.parse(cachedData) as CachedRecording[];
        recordings.forEach(recording => {
          this.cache.set(recording.id, recording);
        });
      }

      this.isInitialized = true;
      logger.info('Offline recording cache initialized', {
        count: this.cache.size,
      });

      // 监听网络状态变化
      networkMonitor.onNetworkStatusChange(async isOnline => {
        if (isOnline) {
          await this.syncPendingRecordings();
        }
      });
    } catch (error) {
      logger.error('Failed to initialize offline recording cache', {error});
    }
  }

  async addRecording(audioPath: string): Promise<string> {
    try {
      const id = `recording_${Date.now()}`;
      const recording: CachedRecording = {
        id,
        audioPath,
        createdAt: Date.now(),
        isTranscribed: false,
        isSynced: false,
      };

      this.cache.set(id, recording);
      await this.saveCacheToStorage();

      logger.info('Recording added to offline cache', {id, audioPath});
      return id;
    } catch (error) {
      logger.error('Failed to add recording to cache', {error});
      throw error;
    }
  }

  async transcribeOfflineRecording(id: string): Promise<boolean> {
    try {
      const recording = this.cache.get(id);
      if (!recording) {
        logger.warn('Recording not found in cache', {id});
        return false;
      }

      if (recording.isTranscribed) {
        logger.info('Recording already transcribed', {id});
        return true;
      }

      // 尝试离线转写
      const result = await asrService.transcribeOffline(recording.audioPath);
      if (result) {
        recording.transcript = result.text;
        recording.confidence = result.confidence;
        recording.isTranscribed = true;
        await this.saveCacheToStorage();

        logger.info('Recording transcribed offline', {id});
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to transcribe offline recording', {id, error});
      return false;
    }
  }

  async syncPendingRecordings(): Promise<boolean> {
    try {
      const pendingRecordings = Array.from(this.cache.values()).filter(
        r => !r.isSynced,
      );

      if (pendingRecordings.length === 0) {
        logger.info('No pending recordings to sync');
        return true;
      }

      logger.info('Starting sync of pending recordings', {
        count: pendingRecordings.length,
      });

      for (const recording of pendingRecordings) {
        // 如果还没有转写，先进行在线转写
        if (!recording.isTranscribed) {
          const result = await asrService.transcribe(recording.audioPath);
          if (result) {
            recording.transcript = result.text;
            recording.confidence = result.confidence;
            recording.isTranscribed = true;
          }
        }

        // 保存到数据库
        const entryId = await databaseService.insertEntry({
          type: 'voice',
          content: recording.transcript || '语音记录',
          mediaPath: recording.audioPath,
          createdAt: recording.createdAt,
          updatedAt: Date.now(),
        });

        if (entryId) {
          recording.isSynced = true;
          logger.info('Recording synced to database', {
            recordingId: recording.id,
            entryId,
          });
        }
      }

      await this.saveCacheToStorage();
      logger.info('Sync completed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to sync pending recordings', {error});
      return false;
    }
  }

  async getRecording(id: string): Promise<CachedRecording | null> {
    return this.cache.get(id) || null;
  }

  async getAllRecordings(): Promise<CachedRecording[]> {
    return Array.from(this.cache.values());
  }

  async getPendingRecordings(): Promise<CachedRecording[]> {
    return Array.from(this.cache.values()).filter(r => !r.isSynced);
  }

  async removeRecording(id: string): Promise<boolean> {
    try {
      const recording = this.cache.get(id);
      if (!recording) {
        return false;
      }

      // 删除音频文件
      await audioStorage.deleteAudio(recording.audioPath);

      // 从缓存中移除
      this.cache.delete(id);
      await this.saveCacheToStorage();

      logger.info('Recording removed from cache', {id});
      return true;
    } catch (error) {
      logger.error('Failed to remove recording from cache', {id, error});
      return false;
    }
  }

  async clearCache(): Promise<void> {
    try {
      this.cache.clear();
      await AsyncStorage.removeItem(CACHE_KEY);
      logger.info('Offline recording cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', {error});
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      const recordings = Array.from(this.cache.values());
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recordings));
    } catch (error) {
      logger.error('Failed to save cache to storage', {error});
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getPendingCount(): number {
    return Array.from(this.cache.values()).filter(r => !r.isSynced).length;
  }
}

export const offlineRecordingCache = new OfflineRecordingCache();


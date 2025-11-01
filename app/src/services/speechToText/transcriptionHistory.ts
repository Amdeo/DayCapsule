/**
 * 转录历史记录服务
 * 用于管理和追踪转录文本的版本历史
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {logger} from '@services/telemetry/logger';

export interface TranscriptionVersion {
  id: string;
  entryId: string;
  text: string;
  language: string;
  confidence: number;
  timestamp: number;
  source: 'auto' | 'manual' | 'edit'; // 来源：自动转录、手动输入、编辑
  notes?: string;
}

export interface TranscriptionHistory {
  entryId: string;
  versions: TranscriptionVersion[];
  currentVersionId: string;
}

class TranscriptionHistoryService {
  private readonly STORAGE_KEY_PREFIX = '@transcription_history_';
  private readonly MAX_VERSIONS_PER_ENTRY = 10;

  /**
   * 添加转录版本
   */
  async addVersion(
    entryId: string,
    text: string,
    language: string,
    confidence: number,
    source: 'auto' | 'manual' | 'edit',
    notes?: string,
  ): Promise<TranscriptionVersion> {
    try {
      const history = await this.getHistory(entryId);
      const version: TranscriptionVersion = {
        id: `${entryId}_${Date.now()}`,
        entryId,
        text,
        language,
        confidence,
        timestamp: Date.now(),
        source,
        notes,
      };

      // 添加新版本到历史记录
      history.versions.unshift(version);
      history.currentVersionId = version.id;

      // 限制版本数量
      if (history.versions.length > this.MAX_VERSIONS_PER_ENTRY) {
        history.versions = history.versions.slice(0, this.MAX_VERSIONS_PER_ENTRY);
      }

      // 保存到存储
      await this.saveHistory(entryId, history);

      logger.debug('Transcription version added', {
        entryId,
        versionId: version.id,
        source,
      });

      return version;
    } catch (error) {
      logger.error('Failed to add transcription version', error);
      throw error;
    }
  }

  /**
   * 获取转录历史记录
   */
  async getHistory(entryId: string): Promise<TranscriptionHistory> {
    try {
      const key = this.STORAGE_KEY_PREFIX + entryId;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        return JSON.parse(data);
      }

      // 返回空的历史记录
      return {
        entryId,
        versions: [],
        currentVersionId: '',
      };
    } catch (error) {
      logger.error('Failed to get transcription history', error);
      throw error;
    }
  }

  /**
   * 获取特定版本
   */
  async getVersion(entryId: string, versionId: string): Promise<TranscriptionVersion | null> {
    try {
      const history = await this.getHistory(entryId);
      return history.versions.find(v => v.id === versionId) || null;
    } catch (error) {
      logger.error('Failed to get transcription version', error);
      throw error;
    }
  }

  /**
   * 切换到特定版本
   */
  async switchToVersion(entryId: string, versionId: string): Promise<TranscriptionVersion> {
    try {
      const history = await this.getHistory(entryId);
      const version = history.versions.find(v => v.id === versionId);

      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      history.currentVersionId = versionId;
      await this.saveHistory(entryId, history);

      logger.debug('Switched to transcription version', {
        entryId,
        versionId,
      });

      return version;
    } catch (error) {
      logger.error('Failed to switch transcription version', error);
      throw error;
    }
  }

  /**
   * 删除特定版本
   */
  async deleteVersion(entryId: string, versionId: string): Promise<void> {
    try {
      const history = await this.getHistory(entryId);

      // 不能删除当前版本
      if (history.currentVersionId === versionId) {
        throw new Error('Cannot delete current version');
      }

      history.versions = history.versions.filter(v => v.id !== versionId);
      await this.saveHistory(entryId, history);

      logger.debug('Transcription version deleted', {
        entryId,
        versionId,
      });
    } catch (error) {
      logger.error('Failed to delete transcription version', error);
      throw error;
    }
  }

  /**
   * 清除所有历史记录
   */
  async clearHistory(entryId: string): Promise<void> {
    try {
      const key = this.STORAGE_KEY_PREFIX + entryId;
      await AsyncStorage.removeItem(key);

      logger.debug('Transcription history cleared', {entryId});
    } catch (error) {
      logger.error('Failed to clear transcription history', error);
      throw error;
    }
  }

  /**
   * 比较两个版本
   */
  async compareVersions(
    entryId: string,
    versionId1: string,
    versionId2: string,
  ): Promise<{version1: TranscriptionVersion; version2: TranscriptionVersion; diff: string}> {
    try {
      const version1 = await this.getVersion(entryId, versionId1);
      const version2 = await this.getVersion(entryId, versionId2);

      if (!version1 || !version2) {
        throw new Error('One or both versions not found');
      }

      // 简单的差异计算
      const diff = this.calculateDiff(version1.text, version2.text);

      return {version1, version2, diff};
    } catch (error) {
      logger.error('Failed to compare transcription versions', error);
      throw error;
    }
  }

  /**
   * 保存历史记录
   */
  private async saveHistory(entryId: string, history: TranscriptionHistory): Promise<void> {
    const key = this.STORAGE_KEY_PREFIX + entryId;
    await AsyncStorage.setItem(key, JSON.stringify(history));
  }

  /**
   * 计算两个文本的差异
   */
  private calculateDiff(text1: string, text2: string): string {
    if (text1 === text2) {
      return '无差异';
    }

    // 简单的差异计算：显示字符数差异
    const diff = Math.abs(text1.length - text2.length);
    return `字符数差异: ${diff}`;
  }
}

export const transcriptionHistoryService = new TranscriptionHistoryService();


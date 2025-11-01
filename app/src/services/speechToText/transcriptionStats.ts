/**
 * 转录统计分析服务
 * 用于统计和分析转录文本的各种指标
 */

import {databaseService, LifelogEntry} from '@services/storage/database';
import {logger} from '@services/telemetry/logger';

export interface TranscriptionStats {
  totalEntries: number;
  totalTranscribedEntries: number;
  totalCharacters: number;
  averageCharactersPerEntry: number;
  averageConfidence: number;
  confidenceDistribution: {
    excellent: number; // >= 0.95
    good: number; // 0.85-0.94
    fair: number; // 0.75-0.84
    poor: number; // < 0.75
  };
  languageDistribution: Record<string, number>;
  longestTranscription: {
    entryId: string;
    characters: number;
    language: string;
  } | null;
  shortestTranscription: {
    entryId: string;
    characters: number;
    language: string;
  } | null;
}

class TranscriptionStatsService {
  /**
   * 获取转录统计信息
   */
  async getStats(): Promise<TranscriptionStats> {
    try {
      // 获取所有记录
      const entries = await databaseService.getEntries(10000, 0);

      // 过滤出有转录的语音记录
      const transcribedEntries = entries.filter(
        entry => entry.type === 'voice' && entry.transcription,
      );

      if (transcribedEntries.length === 0) {
        return this.getEmptyStats(entries.length);
      }

      // 计算统计信息
      const stats = this.calculateStats(entries, transcribedEntries);

      logger.debug('Transcription stats calculated', {
        totalEntries: entries.length,
        transcribedEntries: transcribedEntries.length,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to calculate transcription stats', error);
      throw error;
    }
  }

  /**
   * 获取按日期范围的统计信息
   */
  async getStatsByDateRange(startDate: number, endDate: number): Promise<TranscriptionStats> {
    try {
      const entries = await databaseService.getEntriesByDateRange(startDate, endDate);

      const transcribedEntries = entries.filter(
        entry => entry.type === 'voice' && entry.transcription,
      );

      if (transcribedEntries.length === 0) {
        return this.getEmptyStats(entries.length);
      }

      return this.calculateStats(entries, transcribedEntries);
    } catch (error) {
      logger.error('Failed to calculate transcription stats by date range', error);
      throw error;
    }
  }

  /**
   * 获取按语言的统计信息
   */
  async getStatsByLanguage(language: string): Promise<TranscriptionStats> {
    try {
      const entries = await databaseService.getEntries(10000, 0);

      const transcribedEntries = entries.filter(
        entry =>
          entry.type === 'voice' && entry.transcription && entry.transcriptionLanguage === language,
      );

      if (transcribedEntries.length === 0) {
        return this.getEmptyStats(entries.length);
      }

      return this.calculateStats(entries, transcribedEntries);
    } catch (error) {
      logger.error('Failed to calculate transcription stats by language', error);
      throw error;
    }
  }

  /**
   * 计算统计信息
   */
  private calculateStats(
    allEntries: LifelogEntry[],
    transcribedEntries: LifelogEntry[],
  ): TranscriptionStats {
    let totalCharacters = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    const languageDistribution: Record<string, number> = {};
    const confidenceDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };

    let longestTranscription: {entryId: string; characters: number; language: string} | null = null;
    let shortestTranscription: {entryId: string; characters: number; language: string} | null =
      null;

    for (const entry of transcribedEntries) {
      const transcription = entry.transcription || '';
      const characters = transcription.length;
      const language = entry.transcriptionLanguage || 'unknown';
      const confidence = entry.transcriptionConfidence || 0;

      // 累计字符数
      totalCharacters += characters;

      // 累计置信度
      if (confidence > 0) {
        totalConfidence += confidence;
        confidenceCount += 1;

        // 分布统计
        if (confidence >= 0.95) {
          confidenceDistribution.excellent += 1;
        } else if (confidence >= 0.85) {
          confidenceDistribution.good += 1;
        } else if (confidence >= 0.75) {
          confidenceDistribution.fair += 1;
        } else {
          confidenceDistribution.poor += 1;
        }
      }

      // 语言分布
      languageDistribution[language] = (languageDistribution[language] || 0) + 1;

      // 最长转录
      if (!longestTranscription || characters > longestTranscription.characters) {
        longestTranscription = {entryId: entry.id, characters, language};
      }

      // 最短转录
      if (!shortestTranscription || characters < shortestTranscription.characters) {
        shortestTranscription = {entryId: entry.id, characters, language};
      }
    }

    return {
      totalEntries: allEntries.length,
      totalTranscribedEntries: transcribedEntries.length,
      totalCharacters,
      averageCharactersPerEntry:
        transcribedEntries.length > 0 ? Math.round(totalCharacters / transcribedEntries.length) : 0,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      confidenceDistribution,
      languageDistribution,
      longestTranscription,
      shortestTranscription,
    };
  }

  /**
   * 获取空的统计信息
   */
  private getEmptyStats(totalEntries: number): TranscriptionStats {
    return {
      totalEntries,
      totalTranscribedEntries: 0,
      totalCharacters: 0,
      averageCharactersPerEntry: 0,
      averageConfidence: 0,
      confidenceDistribution: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
      },
      languageDistribution: {},
      longestTranscription: null,
      shortestTranscription: null,
    };
  }
}

export const transcriptionStatsService = new TranscriptionStatsService();

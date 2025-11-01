import {useEffect, useRef, useCallback, useState} from 'react';
import {logger} from '@services/telemetry/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AutoSaveData {
  type: 'photo' | 'text';
  content: string;
  photos?: string[];
  tags: string[];
  mood: string;
  timestamp: number;
}

export interface UseAutoSaveReturn {
  saveDraft: (data: AutoSaveData) => Promise<void>;
  loadDraft: () => Promise<AutoSaveData | null>;
  clearDraft: () => Promise<void>;
  isDraftAvailable: boolean;
  lastSaveTime: number | null;
}

const DRAFT_STORAGE_KEY = '@memorycapsule_draft';
const AUTO_SAVE_INTERVAL = 3000; // 3 秒

/**
 * 草稿自动保存 Hook
 * 定期保存草稿到本地存储，支持恢复
 */
export const useAutoSave = (
  data: AutoSaveData | null,
  enabled: boolean = true,
): UseAutoSaveReturn => {
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [isDraftAvailable, setIsDraftAvailable] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  // 保存草稿
  const saveDraft = useCallback(
    async (draftData: AutoSaveData) => {
      try {
        const draftWithTimestamp = {
          ...draftData,
          timestamp: Date.now(),
        };

        await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftWithTimestamp));
        setLastSaveTime(Date.now());
        setIsDraftAvailable(true);

        logger.info(`Draft auto-saved: ${draftData.type} (${draftData.content.length} chars)`);
      } catch (error) {
        logger.error(`Failed to save draft: ${error}`);
      }
    },
    [],
  );

  // 加载草稿
  const loadDraft = useCallback(async (): Promise<AutoSaveData | null> => {
    try {
      const draftJson = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftJson) {
        const draft = JSON.parse(draftJson) as AutoSaveData;
        logger.info(`Draft loaded: ${draft.type} (${draft.content.length} chars)`);
        return draft;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to load draft: ${error}`);
      return null;
    }
  }, []);

  // 清除草稿
  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      setIsDraftAvailable(false);
      setLastSaveTime(null);
      logger.info('Draft cleared');
    } catch (error) {
      logger.error(`Failed to clear draft: ${error}`);
    }
  }, []);

  // 检查是否有可用的草稿
  useEffect(() => {
    const checkDraftAvailability = async () => {
      try {
        const draftJson = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        setIsDraftAvailable(!!draftJson);
      } catch (error) {
        logger.error(`Failed to check draft availability: ${error}`);
      }
    };

    checkDraftAvailability();
  }, []);

  // 自动保存逻辑
  useEffect(() => {
    if (!enabled || !data) {
      return;
    }

    // 清除之前的计时器
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // 设置新的计时器
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(data);
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [data, enabled, saveDraft]);

  // 清理
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    isDraftAvailable,
    lastSaveTime,
  };
};

/**
 * 获取草稿恢复提示
 */
export const getDraftRecoveryPrompt = (draft: AutoSaveData | null): string | null => {
  if (!draft) {
    return null;
  }

  const timeDiff = Date.now() - draft.timestamp;
  const minutes = Math.floor(timeDiff / 60000);

  if (minutes < 1) {
    return '检测到未保存的草稿，是否恢复？';
  } else if (minutes < 60) {
    return `检测到 ${minutes} 分钟前的草稿，是否恢复？`;
  } else {
    const hours = Math.floor(minutes / 60);
    return `检测到 ${hours} 小时前的草稿，是否恢复？`;
  }
};

/**
 * 验证草稿是否过期
 */
export const isDraftExpired = (draft: AutoSaveData | null, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean => {
  if (!draft) {
    return true;
  }

  const age = Date.now() - draft.timestamp;
  return age > maxAgeMs;
};


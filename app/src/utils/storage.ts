import { createMMKV } from 'react-native-mmkv';
import { logger } from '@/src/utils/logger';

const mmkv = createMMKV({ id: 'app-storage' });

export const withScope = (scope: string, key: string): string => `${scope}:${key}`;

/**
 * 存储工具类
 * 使用 MMKV 提供高性能持久化存储（需要 EAS Build / custom dev client）
 */
export const Storage = {
  setString: async (key: string, value: string): Promise<void> => {
    try {
      mmkv.set(key, value);
    } catch (error) {
      logger.error(`Failed to save string for key "${key}":`, error);
    }
  },

  getString: async (key: string): Promise<string | null> => {
    try {
      return mmkv.getString(key) ?? null;
    } catch (error) {
      logger.error(`Failed to get string for key "${key}":`, error);
      return null;
    }
  },

  getStringSync: (key: string): string | null => {
    try {
      return mmkv.getString(key) ?? null;
    } catch (error) {
      logger.error(`Failed to sync get string for key "${key}":`, error);
      return null;
    }
  },

  setObject: async <T>(key: string, value: T): Promise<void> => {
    try {
      mmkv.set(key, JSON.stringify(value));
    } catch (error) {
      logger.error(`Failed to save object for key "${key}":`, error);
    }
  },

  getObject: async <T>(key: string): Promise<T | null> => {
    try {
      const value = mmkv.getString(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Failed to get object for key "${key}":`, error);
      return null;
    }
  },

  getObjectSync: <T>(key: string): T | null => {
    try {
      const value = mmkv.getString(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Failed to sync get object for key "${key}":`, error);
      return null;
    }
  },

  delete: async (key: string): Promise<void> => {
    try {
      mmkv.remove(key);
    } catch (error) {
      logger.error(`Failed to delete key "${key}":`, error);
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      mmkv.clearAll();
    } catch (error) {
      logger.error('Failed to clear storage:', error);
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      return mmkv.getAllKeys();
    } catch (error) {
      logger.error('Failed to get all keys:', error);
      return [];
    }
  },
};

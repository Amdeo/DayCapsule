import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 存储工具类
 * 使用 AsyncStorage 提供持久化存储（Expo Go 兼容）
 */
export const Storage = {
  /**
   * 存储字符串
   */
  setString: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to save string for key "${key}":`, error);
    }
  },

  /**
   * 获取字符串
   */
  getString: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get string for key "${key}":`, error);
      return null;
    }
  },

  /**
   * 存储对象（自动序列化为 JSON）
   */
  setObject: async <T>(key: string, value: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save object for key "${key}":`, error);
    }
  },

  /**
   * 获取对象（自动反序列化）
   */
  getObject: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to get object for key "${key}":`, error);
      return null;
    }
  },

  /**
   * 删除指定键
   */
  delete: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to delete key "${key}":`, error);
    }
  },

  /**
   * 清空所有数据
   */
  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  },

  /**
   * 获取所有键
   */
  getAllKeys: async (): Promise<string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  },
};

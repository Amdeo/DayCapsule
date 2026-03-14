/**
 * 设置共享状态管理
 * 避免轮询读取 MMKV，使用 Zustand 订阅机制
 */

import { create } from 'zustand';
import { Storage } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';

export type CardSpacing = 'compact' | 'default' | 'loose';

export const SPACING_VALUES: Record<CardSpacing, number> = {
  compact: 8,
  default: 16,
  loose: 24,
};

export type PhotoHeightPreset = 'compact' | 'default' | 'large';

export const PHOTO_HEIGHT_VALUES: Record<PhotoHeightPreset, number> = {
  compact: 200,
  default: 280,
  large:   400,
};

interface SettingsState {
  // 设置值
  notifications: boolean;
  autoBackup: boolean;
  highQualityPhotos: boolean;
  cardSpacing: CardSpacing;
  photoHeight: PhotoHeightPreset;

  // 加载状态
  isLoaded: boolean;

  // 加载设置
  loadSettings: () => Promise<void>;

  // 更新方法
  setNotifications: (value: boolean) => Promise<void>;
  setAutoBackup: (value: boolean) => Promise<void>;
  setHighQualityPhotos: (value: boolean) => Promise<void>;
  setCardSpacing: (value: CardSpacing) => Promise<void>;
  setPhotoHeight: (value: PhotoHeightPreset) => Promise<void>;

  // 重置设置
  resetSettings: () => Promise<void>;
}

const SETTINGS_KEYS = {
  notifications:     'settings:notifications',
  autoBackup:        'settings:autoBackup',
  highQualityPhotos: 'settings:highQualityPhotos',
  cardSpacing:       'settings:cardSpacing',
  photoHeight:       'settings:photoHeight',
};

const DEFAULT_SETTINGS = {
  notifications: true,
  autoBackup: false,
  highQualityPhotos: true,
  cardSpacing: 'default' as CardSpacing,
  photoHeight: 'default' as PhotoHeightPreset,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const [notif, backup, hq, spacing, ph] = await Promise.all([
        Storage.getString(SETTINGS_KEYS.notifications),
        Storage.getString(SETTINGS_KEYS.autoBackup),
        Storage.getString(SETTINGS_KEYS.highQualityPhotos),
        Storage.getString(SETTINGS_KEYS.cardSpacing),
        Storage.getString(SETTINGS_KEYS.photoHeight),
      ]);

      const validSpacing = (value: string | null): CardSpacing => {
        if (value === 'compact' || value === 'loose') return value;
        return 'default';
      };

      const validPhotoHeight = (value: string | null): PhotoHeightPreset => {
        if (value === 'compact' || value === 'large') return value;
        return 'default';
      };

      set({
        notifications: notif === null ? DEFAULT_SETTINGS.notifications : notif === 'true',
        autoBackup: backup === null ? DEFAULT_SETTINGS.autoBackup : backup === 'true',
        highQualityPhotos: hq === null ? DEFAULT_SETTINGS.highQualityPhotos : hq === 'true',
        cardSpacing: spacing === null ? DEFAULT_SETTINGS.cardSpacing : validSpacing(spacing),
        photoHeight: ph === null ? DEFAULT_SETTINGS.photoHeight : validPhotoHeight(ph),
        isLoaded: true,
      });
    } catch (error) {
      logger.error('[SettingsStore] Failed to load settings:', error);
      set({ isLoaded: true });
    }
  },

  setNotifications: async (value) => {
    await Storage.setString(SETTINGS_KEYS.notifications, String(value));
    set({ notifications: value });
  },

  setAutoBackup: async (value) => {
    await Storage.setString(SETTINGS_KEYS.autoBackup, String(value));
    set({ autoBackup: value });
  },

  setHighQualityPhotos: async (value) => {
    await Storage.setString(SETTINGS_KEYS.highQualityPhotos, String(value));
    set({ highQualityPhotos: value });
  },

  setCardSpacing: async (value) => {
    await Storage.setString(SETTINGS_KEYS.cardSpacing, value);
    set({ cardSpacing: value });
  },

  setPhotoHeight: async (value) => {
    await Storage.setString(SETTINGS_KEYS.photoHeight, value);
    set({ photoHeight: value });
  },

  resetSettings: async () => {
    await Promise.all([
      Storage.delete(SETTINGS_KEYS.notifications),
      Storage.delete(SETTINGS_KEYS.autoBackup),
      Storage.delete(SETTINGS_KEYS.highQualityPhotos),
      Storage.delete(SETTINGS_KEYS.cardSpacing),
      Storage.delete(SETTINGS_KEYS.photoHeight),
    ]);
    set({ ...DEFAULT_SETTINGS });
  },
}));

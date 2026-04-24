/**
 * 设置共享状态管理
 * 避免轮询读取 MMKV，使用 Zustand 订阅机制
 */

import { create } from 'zustand';
import { Storage, withScope } from '@/src/utils/storage';
import { logger } from '@/src/utils/logger';
import { getCurrentDataScopeKey } from '@/src/services/workspaceService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

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

export type CalendarDensity = 'comfortable' | 'default' | 'compact';

export type LastAddType = 'text' | 'camera' | 'photo' | 'voice';

export type ViewMode = 'timeline' | 'card' | 'calendar';

interface SettingsState {
  // 设置值
  notifications: boolean;
  highQualityPhotos: boolean;
  cardSpacing: CardSpacing;
  photoHeight: PhotoHeightPreset;
  calendarDensity: CalendarDensity;
  lastAddType: LastAddType | null;
  viewMode: ViewMode;

  // 加载状态
  isLoaded: boolean;

  // 加载设置
  loadSettings: () => Promise<void>;

  // 更新方法
  setNotifications: (value: boolean) => Promise<void>;
  setHighQualityPhotos: (value: boolean) => Promise<void>;
  setCardSpacing: (value: CardSpacing) => Promise<void>;
  setPhotoHeight: (value: PhotoHeightPreset) => Promise<void>;
  setCalendarDensity: (value: CalendarDensity) => Promise<void>;
  setLastAddType: (value: LastAddType) => Promise<void>;
  setViewMode: (value: ViewMode) => Promise<void>;

  // 重置设置
  resetSettings: () => Promise<void>;
}

const SETTINGS_KEYS = {
  notifications:     'settings:notifications',
  highQualityPhotos: 'settings:highQualityPhotos',
  cardSpacing:       'settings:cardSpacing',
  photoHeight:       'settings:photoHeight',
  calendarDensity:   'settings:calendarDensity',
  lastAddType:       'settings:lastAddType',
  viewMode:          'settings:viewMode',
};

const DEFAULT_SETTINGS = {
  notifications: true,
  highQualityPhotos: true,
  cardSpacing: 'default' as CardSpacing,
  photoHeight: 'default' as PhotoHeightPreset,
  calendarDensity: 'default' as CalendarDensity,
  lastAddType: null as LastAddType | null,
  viewMode: 'timeline' as ViewMode,
};

const getScopedSettingsKey = async (key: string): Promise<string> => {
  const scope = await getCurrentDataScopeKey();
  return withScope(scope, key);
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const scopedKeys = await Promise.all([
        getScopedSettingsKey(SETTINGS_KEYS.notifications),
        getScopedSettingsKey(SETTINGS_KEYS.highQualityPhotos),
        getScopedSettingsKey(SETTINGS_KEYS.cardSpacing),
        getScopedSettingsKey(SETTINGS_KEYS.photoHeight),
        getScopedSettingsKey(SETTINGS_KEYS.calendarDensity),
        getScopedSettingsKey(SETTINGS_KEYS.lastAddType),
        getScopedSettingsKey(SETTINGS_KEYS.viewMode),
      ]);

      const [notif, hq, spacing, ph, density, lat, vm] = await Promise.all([
        Storage.getString(scopedKeys[0]),
        Storage.getString(scopedKeys[1]),
        Storage.getString(scopedKeys[2]),
        Storage.getString(scopedKeys[3]),
        Storage.getString(scopedKeys[4]),
        Storage.getString(scopedKeys[5]),
        Storage.getString(scopedKeys[6]),
      ]);

      const validSpacing = (value: string | null): CardSpacing => {
        if (value === 'compact' || value === 'loose') return value;
        return 'default';
      };

      const validPhotoHeight = (value: string | null): PhotoHeightPreset => {
        if (value === 'compact' || value === 'large') return value;
        return 'default';
      };

      const validCalendarDensity = (value: string | null): CalendarDensity => {
        if (value === 'comfortable' || value === 'compact') return value;
        return 'default';
      };

      const validLastAddType = (value: string | null): LastAddType | null => {
        if (value === 'text' || value === 'camera' || value === 'photo' || value === 'voice') return value;
        return null;
      };

      const validViewMode = (value: string | null): ViewMode => {
        if (value === 'card' || value === 'calendar') return value;
        return 'timeline';
      };

      set({
        notifications: notif === null ? DEFAULT_SETTINGS.notifications : notif === 'true',
        highQualityPhotos: hq === null ? DEFAULT_SETTINGS.highQualityPhotos : hq === 'true',
        cardSpacing: spacing === null ? DEFAULT_SETTINGS.cardSpacing : validSpacing(spacing),
        photoHeight: ph === null ? DEFAULT_SETTINGS.photoHeight : validPhotoHeight(ph),
        calendarDensity: density === null ? DEFAULT_SETTINGS.calendarDensity : validCalendarDensity(density),
        lastAddType: validLastAddType(lat),
        viewMode: vm === null ? DEFAULT_SETTINGS.viewMode : validViewMode(vm),
        isLoaded: true,
      });
    } catch (error) {
      logger.error('[SettingsStore] Failed to load settings:', error);
      showErrorFeedback({
        title: '加载失败',
        message: '设置加载失败，已使用默认设置。',
        actions: [{ label: '知道了', role: 'primary' }],
      });
      set({ isLoaded: true });
    }
  },

  setNotifications: async (value) => {
    await Storage.setString(await getScopedSettingsKey(SETTINGS_KEYS.notifications), String(value));
    set({ notifications: value });
  },

  setHighQualityPhotos: async (value) => {
    await Storage.setString(await getScopedSettingsKey(SETTINGS_KEYS.highQualityPhotos), String(value));
    set({ highQualityPhotos: value });
  },

  setCardSpacing: async (value) => {
    await Storage.setString(await getScopedSettingsKey(SETTINGS_KEYS.cardSpacing), value);
    set({ cardSpacing: value });
  },

  setPhotoHeight: async (value) => {
    await Storage.setString(await getScopedSettingsKey(SETTINGS_KEYS.photoHeight), value);
    set({ photoHeight: value });
  },

  setCalendarDensity: async (value) => {
    await Storage.setString(await getScopedSettingsKey(SETTINGS_KEYS.calendarDensity), value);
    set({ calendarDensity: value });
  },

  setLastAddType: async (value) => {
    await Storage.setString(await getScopedSettingsKey(SETTINGS_KEYS.lastAddType), value);
    set({ lastAddType: value });
  },

  setViewMode: async (value) => {
    await Storage.setString(await getScopedSettingsKey(SETTINGS_KEYS.viewMode), value);
    set({ viewMode: value });
  },

  resetSettings: async () => {
    const scopedKeys = await Promise.all([
      getScopedSettingsKey(SETTINGS_KEYS.notifications),
      getScopedSettingsKey(SETTINGS_KEYS.highQualityPhotos),
      getScopedSettingsKey(SETTINGS_KEYS.cardSpacing),
      getScopedSettingsKey(SETTINGS_KEYS.photoHeight),
      getScopedSettingsKey(SETTINGS_KEYS.calendarDensity),
      getScopedSettingsKey(SETTINGS_KEYS.lastAddType),
      getScopedSettingsKey(SETTINGS_KEYS.viewMode),
    ]);
    await Promise.all([
      Storage.delete(scopedKeys[0]),
      Storage.delete(scopedKeys[1]),
      Storage.delete(scopedKeys[2]),
      Storage.delete(scopedKeys[3]),
      Storage.delete(scopedKeys[4]),
      Storage.delete(scopedKeys[5]),
      Storage.delete(scopedKeys[6]),
    ]);
    set({ ...DEFAULT_SETTINGS });
  },
}));

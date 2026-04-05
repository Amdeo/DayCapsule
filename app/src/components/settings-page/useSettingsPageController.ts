import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildNotificationPermissionFeedback } from '@/src/services/errorFeedbackPresets';
import type {
  CalendarDensity,
  CardSpacing,
  PhotoHeightPreset,
} from '@/src/store/settingsStore';
import type { Entry } from '@/src/types/entry';
import { NotificationService } from '@/src/services/notificationService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { useSettingsPageStorage } from './useSettingsPageStorage';
import { useSettingsPageBackendServer } from './useSettingsPageBackendServer';

interface UseSettingsPageControllerOptions {
  visible: boolean;
  entries: Entry[];
  isLoaded: boolean;
  notifications: boolean;
  loadSettings: () => void | Promise<void>;
  saveNotifications: (value: boolean) => void | Promise<void>;
  saveHighQualityPhotos: (value: boolean) => void | Promise<void>;
  saveCardSpacing: (value: CardSpacing) => void | Promise<void>;
  savePhotoHeight: (value: PhotoHeightPreset) => void | Promise<void>;
  saveCalendarDensity: (value: CalendarDensity) => void | Promise<void>;
}

export function useSettingsPageController({
  visible,
  entries,
  isLoaded,
  notifications,
  loadSettings,
  saveNotifications,
  saveHighQualityPhotos,
  saveCardSpacing,
  savePhotoHeight,
  saveCalendarDensity,
}: UseSettingsPageControllerOptions) {
  const [showTagMgmt, setShowTagMgmt] = useState(false);
  const { usedSpace, refreshStorageStats, handleClearCache } = useSettingsPageStorage();
  const {
    currentServerUrl,
    backendDraftUrl,
    recentServerUrls,
    backendTestStatus,
    backendTestErrorMessage,
    isSavingBackendServer,
    canSaveBackendServer,
    handleBackendDraftUrlChange,
    handleTestBackendServer,
    handleSaveBackendServer: saveBackendServer,
    handleSelectRecentBackendServer,
  } = useSettingsPageBackendServer({ visible });

  useEffect(() => {
    if (!isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const syncNotifications = async () => {
      if (!notifications) {
        return;
      }

      const isScheduled = await NotificationService.isReminderScheduled();
      if (!isScheduled) {
        const granted = await NotificationService.requestPermission();
        if (granted) {
          await NotificationService.scheduleDailyReminder();
        }
      }
    };

    void syncNotifications();
  }, [isLoaded, notifications]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    void refreshStorageStats();
  }, [refreshStorageStats, visible]);

  const showSettingsSaveFailedFeedback = useCallback((error: unknown) => {
    showErrorFeedback({
      title: '保存失败',
      message: error instanceof Error ? error.message : '设置保存失败，请稍后重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  }, []);

  const saveSetting = useCallback(
    async <T,>(save: (value: T) => void | Promise<void>, value: T) => {
      try {
        await save(value);
      } catch (error) {
        showSettingsSaveFailedFeedback(error);
      }
    },
    [showSettingsSaveFailedFeedback],
  );

  const handleNotifications = useCallback(
    async (value: boolean) => {
      if (value) {
        const granted = await NotificationService.requestPermission();
        if (!granted) {
          showErrorFeedback(buildNotificationPermissionFeedback());
          return;
        }
        await NotificationService.scheduleDailyReminder();
      } else {
        await NotificationService.cancelDailyReminder();
      }

      await saveNotifications(value);
    },
    [saveNotifications],
  );

  const handleHighQualityPhotos = useCallback(
    async (value: boolean) => saveSetting(saveHighQualityPhotos, value),
    [saveHighQualityPhotos, saveSetting],
  );

  const handleCardSpacing = useCallback(
    async (spacing: CardSpacing) => saveSetting(saveCardSpacing, spacing),
    [saveCardSpacing, saveSetting],
  );

  const handlePhotoHeight = useCallback(
    async (preset: PhotoHeightPreset) => saveSetting(savePhotoHeight, preset),
    [savePhotoHeight, saveSetting],
  );

  const handleCalendarDensity = useCallback(
    async (density: CalendarDensity) => saveSetting(saveCalendarDensity, density),
    [saveCalendarDensity, saveSetting],
  );

  const { photoCount, voiceCount } = useMemo(
    () => ({
      photoCount: entries.filter((entry) => entry.type === 'photo').length,
      voiceCount: entries.filter((entry) => entry.type === 'voice').length,
    }),
    [entries],
  );

  const openTagManagement = useCallback(() => {
    setShowTagMgmt(true);
  }, []);

  const closeTagManagement = useCallback(() => {
    setShowTagMgmt(false);
  }, []);

  const handleSaveBackendServer = useCallback(async () => {
    try {
      const result = await saveBackendServer();
      if (!result) {
        return;
      }

      showErrorFeedback({
        title: result.switched ? '切换成功' : '保存成功',
        message: result.switched ? '后端已切换，请重新登录' : '后端地址已更新',
        tone: 'accent',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    } catch (error) {
      showErrorFeedback({
        title: '切换失败',
        message: (error as Error).message ?? '切换后端失败',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  }, [saveBackendServer]);

  return {
    usedSpace,
    showTagMgmt,
    photoCount,
    voiceCount,
    currentServerUrl,
    backendDraftUrl,
    recentServerUrls,
    backendTestStatus,
    backendTestErrorMessage,
    isSavingBackendServer,
    canSaveBackendServer,
    openTagManagement,
    closeTagManagement,
    handleNotifications,
    handleHighQualityPhotos,
    handleCardSpacing,
    handlePhotoHeight,
    handleCalendarDensity,
    handleBackendDraftUrlChange,
    handleTestBackendServer,
    handleSaveBackendServer,
    handleSelectRecentBackendServer,
    handleClearCache,
  };
}

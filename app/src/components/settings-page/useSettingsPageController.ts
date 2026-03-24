import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildNotificationPermissionFeedback } from '@/src/services/errorFeedbackPresets';
import type {
  CalendarDensity,
  CardSpacing,
  PhotoHeightPreset,
} from '@/src/store/settingsStore';
import type { Entry } from '@/src/types/entry';
import { getStorageStats } from '@/src/utils/fileSystem';
import { NotificationService } from '@/src/services/notificationService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import {
  getCurrentServerUrl,
  getRecentServerUrls,
  normalizeServerUrl,
} from '@/src/services/backendEnvironmentService';
import { testBackendConnection } from '@/src/services/backendConnectionService';
import { switchBackendEnvironment } from '@/src/services/localEnvironmentDataManager';
import { clearLocalAppData } from '@/src/services/localAppDataService';
import { showAppDialog } from '@/src/services/showAppDialog';
import { useEntryStore } from '@/src/store/entryStore';

interface UseSettingsPageControllerOptions {
  visible: boolean;
  entries: Entry[];
  isLoaded: boolean;
  notifications: boolean;
  loadSettings: () => void | Promise<void>;
  saveNotifications: (value: boolean) => void | Promise<void>;
  saveAutoBackup: (value: boolean) => void | Promise<void>;
  saveHighQualityPhotos: (value: boolean) => void | Promise<void>;
  saveCardSpacing: (value: CardSpacing) => void | Promise<void>;
  savePhotoHeight: (value: PhotoHeightPreset) => void | Promise<void>;
  saveCalendarDensity: (value: CalendarDensity) => void | Promise<void>;
  resetSettings: () => void | Promise<void>;
  enableCloudMode: () => void | Promise<void>;
}

function formatUsedSpace(totalSize: number) {
  const mb = totalSize / (1024 * 1024);
  return mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`;
}

export function useSettingsPageController({
  visible,
  entries,
  isLoaded,
  notifications,
  loadSettings,
  saveNotifications,
  saveAutoBackup,
  saveHighQualityPhotos,
  saveCardSpacing,
  savePhotoHeight,
  saveCalendarDensity,
  resetSettings,
  enableCloudMode,
}: UseSettingsPageControllerOptions) {
  const [usedSpace, setUsedSpace] = useState('计算中...');
  const [showTagMgmt, setShowTagMgmt] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState('');
  const [backendDraftUrl, setBackendDraftUrl] = useState('');
  const [recentServerUrls, setRecentServerUrls] = useState<string[]>([]);
  const [backendTestStatus, setBackendTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [backendTestedUrl, setBackendTestedUrl] = useState<string | null>(null);
  const [backendTestErrorMessage, setBackendTestErrorMessage] = useState<string | null>(null);
  const [isSavingBackendServer, setIsSavingBackendServer] = useState(false);

  const showBlockingNotice = useCallback((
    title: string,
    message: string,
    tone: 'neutral' | 'accent' | 'success' | 'error' = 'neutral',
  ) => {
    showAppDialog({
      title,
      message,
      tone,
      blocking: true,
      actions: [{ label: '知道了', role: 'primary' }],
    });
  }, []);

  const loadBackendState = useCallback(async () => {
    const [nextCurrentServerUrl, nextRecentServerUrls] = await Promise.all([
      getCurrentServerUrl(),
      getRecentServerUrls(),
    ]);

    setCurrentServerUrl(nextCurrentServerUrl);
    setBackendDraftUrl(nextCurrentServerUrl);
    setRecentServerUrls(nextRecentServerUrls);
    setBackendTestStatus('idle');
    setBackendTestedUrl(null);
    setBackendTestErrorMessage(null);
  }, []);

  const refreshStorageStats = useCallback(async () => {
    try {
      const stats = await getStorageStats();
      setUsedSpace(formatUsedSpace(stats.totalSize));
    } catch {
      setUsedSpace('未知');
    }
  }, []);

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
    void loadBackendState();
  }, [loadBackendState, refreshStorageStats, visible]);

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

  const handleAutoBackup = useCallback(
    async (value: boolean) => {
      await saveAutoBackup(value);
    },
    [saveAutoBackup],
  );

  const handleHighQualityPhotos = useCallback(
    async (value: boolean) => {
      await saveHighQualityPhotos(value);
    },
    [saveHighQualityPhotos],
  );

  const handleCardSpacing = useCallback(
    async (spacing: CardSpacing) => {
      await saveCardSpacing(spacing);
    },
    [saveCardSpacing],
  );

  const handlePhotoHeight = useCallback(
    async (preset: PhotoHeightPreset) => {
      await savePhotoHeight(preset);
    },
    [savePhotoHeight],
  );

  const handleCalendarDensity = useCallback(
    async (density: CalendarDensity) => {
      await saveCalendarDensity(density);
    },
    [saveCalendarDensity],
  );

  const { photoCount, voiceCount } = useMemo(
    () => ({
      photoCount: entries.filter((entry) => entry.type === 'photo').length,
      voiceCount: entries.filter((entry) => entry.type === 'voice').length,
    }),
    [entries],
  );

  const handleClearCache = useCallback(() => {
    showAppDialog({
      title: '清除缓存',
      message: '确定要清除当前设备上的本地记录、媒体和缓存数据吗？后端数据不会受影响。',
      blocking: true,
      actions: [
        { label: '取消', role: 'secondary' },
        {
          label: '清除',
          role: 'destructive',
          onPress: async () => {
            try {
              setUsedSpace('计算中...');
              await clearLocalAppData();
              await useEntryStore.getState().loadEntries();
              await refreshStorageStats();
              showBlockingNotice('成功', '本地数据已清除', 'success');
            } catch {
              await refreshStorageStats();
              showBlockingNotice('清除失败', '清理本地数据时发生错误', 'error');
            }
          },
        },
      ],
    });
  }, [refreshStorageStats, showBlockingNotice]);

  const handleResetSettings = useCallback(() => {
    showAppDialog({
      title: '重置设置',
      message: '确定要重置所有设置为默认值吗？',
      blocking: true,
      actions: [
        { label: '取消', role: 'secondary' },
        {
          label: '重置',
          role: 'destructive',
          onPress: async () => {
            await resetSettings();
            showBlockingNotice('成功', '设置已重置', 'success');
          },
        },
      ],
    });
  }, [resetSettings, showBlockingNotice]);

  const openTagManagement = useCallback(() => {
    setShowTagMgmt(true);
  }, []);

  const closeTagManagement = useCallback(() => {
    setShowTagMgmt(false);
  }, []);

  const openLogin = useCallback(() => {
    setShowLogin(true);
  }, []);

  const closeLogin = useCallback(() => {
    setShowLogin(false);
  }, []);

  const handleLoginSuccess = useCallback(async () => {
    setShowLogin(false);
    await enableCloudMode();
  }, [enableCloudMode]);

  const handleBackendDraftUrlChange = useCallback((value: string) => {
    setBackendDraftUrl(value);
    setBackendTestStatus('idle');
    setBackendTestedUrl(null);
    setBackendTestErrorMessage(null);
  }, []);

  const handleSelectRecentBackendServer = useCallback((url: string) => {
    setBackendDraftUrl(url);
    setBackendTestStatus('idle');
    setBackendTestedUrl(null);
    setBackendTestErrorMessage(null);
  }, []);

  const handleTestBackendServer = useCallback(async () => {
    setBackendTestStatus('testing');
    setBackendTestErrorMessage(null);

    const result = await testBackendConnection(backendDraftUrl);
    if (!result.success) {
      setBackendTestStatus('error');
      setBackendTestedUrl(null);
      setBackendTestErrorMessage(result.message ?? '连接失败，请检查地址或网络');
      return;
    }

    setBackendTestStatus('success');
    setBackendTestedUrl(normalizeServerUrl(backendDraftUrl));
  }, [backendDraftUrl]);

  const canSaveBackendServer = useMemo(() => {
    if (backendTestStatus !== 'success' || !backendTestedUrl) {
      return false;
    }

    try {
      return normalizeServerUrl(backendDraftUrl) === backendTestedUrl;
    } catch {
      return false;
    }
  }, [backendDraftUrl, backendTestStatus, backendTestedUrl]);

  const handleSaveBackendServer = useCallback(async () => {
    if (!canSaveBackendServer) {
      return;
    }

    setIsSavingBackendServer(true);
    try {
      const result = await switchBackendEnvironment(backendDraftUrl);
      await loadBackendState();
      setBackendTestStatus('success');
      setBackendTestedUrl(result.currentServerUrl);
      showAppDialog({
        title: result.switched ? '切换成功' : '保存成功',
        message: result.switched ? '后端已切换，请重新登录' : '后端地址已更新',
        tone: 'success',
        blocking: true,
        actions: [{ label: '知道了', role: 'primary' }],
      });
    } catch (error) {
      setBackendTestStatus('error');
      setBackendTestErrorMessage((error as Error).message ?? '切换失败');
      showBlockingNotice('切换失败', (error as Error).message ?? '切换后端失败', 'error');
    } finally {
      setIsSavingBackendServer(false);
    }
  }, [backendDraftUrl, canSaveBackendServer, loadBackendState, showBlockingNotice]);

  return {
    usedSpace,
    showTagMgmt,
    showLogin,
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
    openLogin,
    closeLogin,
    handleLoginSuccess,
    handleNotifications,
    handleAutoBackup,
    handleHighQualityPhotos,
    handleCardSpacing,
    handlePhotoHeight,
    handleCalendarDensity,
    handleBackendDraftUrlChange,
    handleTestBackendServer,
    handleSaveBackendServer,
    handleSelectRecentBackendServer,
    handleClearCache,
    handleResetSettings,
  };
}

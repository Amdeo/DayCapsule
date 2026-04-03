import { useCallback, useState } from 'react';
import { useEntryStore } from '@/src/store/entryStore';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { buildCloudModeToggleFailedFeedback } from '@/src/services/errorFeedbackPresets';
import { logger } from '@/src/utils/logger';
import { createSyncBootstrapService } from '@/src/services/syncBootstrapService';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { useSettingsPageDisableCloudMode } from './useSettingsPageDisableCloudMode';

interface UseSettingsPageCloudModeOptions {
  isAuthenticated: boolean;
  cloudMode: boolean | 'switching';
  setCloudMode: (value: boolean | 'switching') => Promise<void>;
  logout: () => void;
  onRequireLogin: () => void;
}

export function useSettingsPageCloudMode({
  isAuthenticated,
  cloudMode,
  setCloudMode,
  logout,
  onRequireLogin,
}: UseSettingsPageCloudModeOptions) {
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const runDisableCloudModeFlow = useSettingsPageDisableCloudMode({ setCloudMode });

  const finishEnableCloud = useCallback(async (source: 'cloud' | 'local') => {
    try {
      const bootstrap = createSyncBootstrapService();
      await bootstrap.runInitialFlow(source);
      await useEntryStore.getState().loadEntries();
      await setCloudMode(true);
      await createCloudSyncService().syncNow().catch((error) => {
        logger.warn('[Settings] 初次启用云同步后的首轮同步失败:', error);
        showErrorFeedback({
          title: '同步未完成',
          message: '云同步已开启，但首次同步失败，请稍后重试。',
          actions: [{ label: '知道了', role: 'primary' }],
        });
      });
    } catch (e: unknown) {
      showErrorFeedback(buildCloudModeToggleFailedFeedback(e, '操作失败'));
      await setCloudMode(false);
    }
  }, [setCloudMode]);

  const enableCloudMode = useCallback(async () => {
    setIsSwitchingMode(true);
    try {
      await setCloudMode('switching');
      const bootstrap = createSyncBootstrapService();
      const inspection = await bootstrap.inspectInitialState();
      const flow = bootstrap.buildInitialFlow(inspection);

      if (flow.type === 'needs-decision') {
        showConfirmDialog({
          title: '数据同步',
          message: `云端 ${flow.cloudCount} 条记录\n本地 ${flow.localCount} 条记录\n\n请选择数据来源：`,
          actions: [
            { label: '使用云端数据', role: 'primary', onPress: () => { void finishEnableCloud('cloud'); } },
            { label: '上传本地数据', role: 'primary', onPress: () => { void finishEnableCloud('local'); } },
            {
              label: '取消',
              role: 'secondary',
              onPress: () => {
                void setCloudMode(false);
              },
            },
          ],
        });
      } else {
        const source = flow.type === 'restoring' ? 'cloud' : 'local';
        await finishEnableCloud(source);
      }
    } catch (e: unknown) {
      showErrorFeedback(buildCloudModeToggleFailedFeedback(e, '请检查网络连接'));
      await setCloudMode(false);
    } finally {
      setIsSwitchingMode(false);
    }
  }, [finishEnableCloud, setCloudMode]);

  const disableCloudMode = useCallback(async () => {
    setIsSwitchingMode(true);
    try {
      await runDisableCloudModeFlow();
    } catch (e: unknown) {
      showErrorFeedback({
        title: '操作失败',
        message: e instanceof Error ? e.message : undefined,
        actions: [{ label: '知道了', role: 'primary' }],
      });
      await setCloudMode(true);
    } finally {
      setIsSwitchingMode(false);
    }
  }, [runDisableCloudModeFlow, setCloudMode]);

  const handleCloudModeToggle = useCallback(async (enable: boolean) => {
    if (enable) {
      if (!isAuthenticated) {
        onRequireLogin();
        return;
      }

      await enableCloudMode();
      return;
    }

    await disableCloudMode();
  }, [disableCloudMode, enableCloudMode, isAuthenticated, onRequireLogin]);

  const handleLogout = useCallback(() => {
    showConfirmDialog({
      title: '退出登录',
      message: '确定要退出登录吗？如果当前是云端模式，将自动切换到离线模式。',
      actions: [
        { label: '取消', role: 'secondary' },
        {
          label: '退出',
          role: 'danger',
          onPress: () => {
            void (async () => {
              if (cloudMode === true) {
                await setCloudMode(false);
                await useEntryStore.getState().loadEntries();
              }
              logout();
            })();
          },
        },
      ],
    });
  }, [cloudMode, logout, setCloudMode]);

  return {
    isSwitchingMode,
    enableCloudMode,
    handleCloudModeToggle,
    handleLogout,
  };
}

import { useCallback, useState } from 'react';
import { useEntryStore } from '@/src/store/entryStore';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { buildCloudModeToggleFailedFeedback } from '@/src/services/errorFeedbackPresets';
import { logger } from '@/src/utils/logger';
import { createSyncBootstrapService } from '@/src/services/syncBootstrapService';
import { getApiClient } from '@/src/services/apiClient';
import { showAppDialog } from '@/src/services/showAppDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import * as DB from '@/src/database/operations';

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

  const finishEnableCloud = useCallback(async (source: 'cloud' | 'local') => {
    try {
      const bootstrap = createSyncBootstrapService();
      await bootstrap.runInitialFlow(source);
      await useEntryStore.getState().loadEntries();
      await setCloudMode(true);
      await createCloudSyncService().syncNow().catch((error) => {
        logger.warn('[Settings] 初次启用云同步后的首轮同步失败:', error);
      });
    } catch (e: any) {
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
        showAppDialog({
          title: '数据同步',
          message: '请选择数据来源：',
          details: [
            { label: '云端', value: `${flow.cloudCount} 条记录` },
            { label: '本地', value: `${flow.localCount} 条记录` },
          ],
          tone: 'accent',
          blocking: true,
          actions: [
            {
              label: '使用云端数据',
              role: 'primary',
              onPress: () => { void finishEnableCloud('cloud'); },
            },
            {
              label: '上传本地数据',
              role: 'secondary',
              onPress: () => { void finishEnableCloud('local'); },
            },
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
    } catch (e: any) {
      showErrorFeedback(buildCloudModeToggleFailedFeedback(e, '请检查网络连接'));
      await setCloudMode(false);
    } finally {
      setIsSwitchingMode(false);
    }
  }, [finishEnableCloud, setCloudMode]);

  const disableCloudMode = useCallback(async () => {
    setIsSwitchingMode(true);
    try {
      await setCloudMode('switching');
      const client = getApiClient();
      const countResult = await client.get<{ entryCount: number }>('/entries/count');
      const cloudCount = countResult.entryCount;
      const localCount = await DB.getEntriesCount();

      const switchToLocalOnly = async () => {
        await useEntryStore.getState().loadEntries();
        await setCloudMode(false);
      };

      if (cloudCount === 0 && localCount > 0) {
        showAppDialog({
          title: '切换到离线模式',
          message: '云端当前为空，继续“云端 → 本地”会清空本地数据。请选择保留本地数据，或先上传到云端。',
          details: [
            { label: '云端', value: '0 条记录' },
            { label: '本地', value: `${localCount} 条记录` },
          ],
          tone: 'accent',
          blocking: true,
          actions: [
            {
              label: '保留本地并切回离线',
              role: 'secondary',
              onPress: () => {
                void (async () => {
                  try {
                    await switchToLocalOnly();
                  } catch (err: any) {
                    showBlockingNotice('切换失败', err?.message ?? '操作失败', 'error');
                    await setCloudMode(true);
                  }
                })();
              },
            },
            {
              label: '本地 → 云端',
              role: 'primary',
              onPress: () => {
                void (async () => {
                  try {
                    const allEntries = await DB.getAllEntries();
                    await client.post('/entries/import', { entries: [] });
                    for (const entry of allEntries) {
                      let mediaIds: string[] | undefined;
                      if (entry.media?.length) {
                        const uploads = await Promise.all(
                          entry.media.map((media) => client.uploadFile('/media/upload', media.uri, 'file'))
                        );
                        mediaIds = uploads.map((upload) => upload.id);
                      }
                      await client.post('/entries', {
                        type: entry.type,
                        content: entry.content,
                        tags: entry.tags,
                        mediaIds,
                        recordingStatus: entry.recordingStatus,
                        recordingDuration: entry.recordingDuration,
                      });
                    }
                    await switchToLocalOnly();
                  } catch (err: any) {
                    showBlockingNotice('同步失败', err?.message ?? '同步失败', 'error');
                    await setCloudMode(true);
                  }
                })();
              },
            },
            {
              label: '取消',
              role: 'secondary',
              onPress: () => {
                void setCloudMode(true);
              },
            },
          ],
        });
        return;
      }

      showAppDialog({
        title: '切换到离线模式',
        message: '请选择数据保留方向：',
        details: [
          { label: '云端', value: `${cloudCount} 条记录` },
          { label: '本地', value: `${localCount} 条记录` },
        ],
        tone: 'accent',
        blocking: true,
        actions: [
          {
            label: '云端 → 本地',
            role: 'primary',
            onPress: () => {
              void (async () => {
                try {
                  const entries = await client.get<any[]>('/entries/export');
                  await DB.clearAllEntries();
                  await DB.restoreEntries(entries);
                  await useEntryStore.getState().loadEntries();
                  await setCloudMode(false);
                } catch (err: any) {
                  showBlockingNotice('同步失败', err?.message ?? '同步失败', 'error');
                  await setCloudMode(true);
                }
              })();
            },
          },
          {
            label: '本地 → 云端',
            role: 'secondary',
            onPress: () => {
              void (async () => {
                try {
                  const allEntries = await DB.getAllEntries();
                  await client.post('/entries/import', { entries: [] });
                  for (const entry of allEntries) {
                    let mediaIds: string[] | undefined;
                    if (entry.media?.length) {
                      const uploads = await Promise.all(
                        entry.media.map((media) => client.uploadFile('/media/upload', media.uri, 'file'))
                      );
                      mediaIds = uploads.map((upload) => upload.id);
                    }
                    await client.post('/entries', {
                      type: entry.type,
                      content: entry.content,
                      tags: entry.tags,
                      mediaIds,
                      recordingStatus: entry.recordingStatus,
                      recordingDuration: entry.recordingDuration,
                    });
                  }
                  await useEntryStore.getState().loadEntries();
                  await setCloudMode(false);
                } catch (err: any) {
                  showBlockingNotice('同步失败', err?.message ?? '同步失败', 'error');
                  await setCloudMode(true);
                }
              })();
            },
          },
          {
            label: '取消',
            role: 'secondary',
            onPress: () => {
              void setCloudMode(true);
            },
          },
        ],
      });
    } catch (e: any) {
      showBlockingNotice('操作失败', e?.message ?? '操作失败', 'error');
      await setCloudMode(true);
    } finally {
      setIsSwitchingMode(false);
    }
  }, [setCloudMode]);

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
    showAppDialog({
      title: '退出登录',
      message: '确定要退出登录吗？如果当前是云端模式，将自动切换到离线模式。',
      blocking: true,
      actions: [
        { label: '取消', role: 'secondary' },
        {
          label: '退出',
          role: 'destructive',
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

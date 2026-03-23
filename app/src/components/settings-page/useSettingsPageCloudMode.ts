import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useEntryStore } from '@/src/store/entryStore';
import { createCloudSyncService } from '@/src/services/cloudSyncService';
import { logger } from '@/src/utils/logger';
import { createSyncBootstrapService } from '@/src/services/syncBootstrapService';
import { getApiClient } from '@/src/services/apiClient';
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
      Alert.alert('切换失败', e?.message ?? '操作失败');
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
        Alert.alert(
          '数据同步',
          `云端 ${flow.cloudCount} 条记录\n本地 ${flow.localCount} 条记录\n\n请选择数据来源：`,
          [
            { text: '使用云端数据', onPress: () => { void finishEnableCloud('cloud'); } },
            { text: '上传本地数据', onPress: () => { void finishEnableCloud('local'); } },
            {
              text: '取消',
              style: 'cancel',
              onPress: () => {
                void setCloudMode(false);
              },
            },
          ],
        );
      } else {
        const source = flow.type === 'restoring' ? 'cloud' : 'local';
        await finishEnableCloud(source);
      }
    } catch (e: any) {
      Alert.alert('切换失败', e?.message ?? '请检查网络连接');
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
        Alert.alert(
          '切换到离线模式',
          `云端 0 条记录\n本地 ${localCount} 条记录\n\n云端当前为空，继续“云端 → 本地”会清空本地数据。请选择保留本地数据，或先上传到云端。`,
          [
            {
              text: '保留本地并切回离线',
              onPress: () => {
                void (async () => {
                  try {
                    await switchToLocalOnly();
                  } catch (err: any) {
                    Alert.alert('切换失败', err?.message ?? '操作失败');
                    await setCloudMode(true);
                  }
                })();
              },
            },
            {
              text: '本地 → 云端',
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
                    Alert.alert('同步失败', err?.message);
                    await setCloudMode(true);
                  }
                })();
              },
            },
            {
              text: '取消',
              style: 'cancel',
              onPress: () => {
                void setCloudMode(true);
              },
            },
          ],
        );
        return;
      }

      Alert.alert(
        '切换到离线模式',
        `云端 ${cloudCount} 条记录\n本地 ${localCount} 条记录\n\n请选择数据保留方向：`,
        [
          {
            text: '云端 → 本地',
            onPress: () => {
              void (async () => {
                try {
                  const entries = await client.get<any[]>('/entries/export');
                  await DB.clearAllEntries();
                  await DB.restoreEntries(entries);
                  await useEntryStore.getState().loadEntries();
                  await setCloudMode(false);
                } catch (err: any) {
                  Alert.alert('同步失败', err?.message);
                  await setCloudMode(true);
                }
              })();
            },
          },
          {
            text: '本地 → 云端',
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
                  Alert.alert('同步失败', err?.message);
                  await setCloudMode(true);
                }
              })();
            },
          },
          {
            text: '取消',
            style: 'cancel',
            onPress: () => {
              void setCloudMode(true);
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('操作失败', e?.message);
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
    Alert.alert('退出登录', '确定要退出登录吗？如果当前是云端模式，将自动切换到离线模式。', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
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
    ]);
  }, [cloudMode, logout, setCloudMode]);

  return {
    isSwitchingMode,
    enableCloudMode,
    handleCloudModeToggle,
    handleLogout,
  };
}

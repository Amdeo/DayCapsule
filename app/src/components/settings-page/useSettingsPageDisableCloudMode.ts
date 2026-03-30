import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useEntryStore } from '@/src/store/entryStore';
import { buildPhotoUploadMetadata } from '@/src/services/photoIntegrityService';
import { getApiClient } from '@/src/services/apiClient';
import * as DB from '@/src/database/operations';

interface UseSettingsPageDisableCloudModeOptions {
  setCloudMode: (value: boolean | 'switching') => Promise<void>;
}

export function useSettingsPageDisableCloudMode({
  setCloudMode,
}: UseSettingsPageDisableCloudModeOptions) {
  return useCallback(async () => {
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
                        entry.media.map((media) => client.uploadFile('/media/upload', media.uri, 'file', {
                          metadata: buildPhotoUploadMetadata(media),
                        }))
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
                      entry.media.map((media) => client.uploadFile('/media/upload', media.uri, 'file', {
                        metadata: buildPhotoUploadMetadata(media),
                      }))
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
  }, [setCloudMode]);
}

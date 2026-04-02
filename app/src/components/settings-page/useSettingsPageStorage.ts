import { useCallback, useState } from 'react';
import { getStorageStats } from '@/src/utils/fileSystem';
import { clearLocalAppData } from '@/src/services/localAppDataService';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { useEntryStore } from '@/src/store/entryStore';

function formatUsedSpace(totalSize: number) {
  const mb = totalSize / (1024 * 1024);
  return mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`;
}

export function useSettingsPageStorage() {
  const [usedSpace, setUsedSpace] = useState('计算中...');

  const refreshStorageStats = useCallback(async () => {
    try {
      const stats = await getStorageStats();
      setUsedSpace(formatUsedSpace(stats.totalSize));
    } catch {
      setUsedSpace('未知');
    }
  }, []);

  const handleClearCache = useCallback(() => {
    showConfirmDialog({
      title: '清除缓存',
      message: '确定要清除当前设备上的本地记录、媒体和缓存数据吗？后端数据不会受影响。',
      actions: [
        { label: '取消', role: 'secondary' },
        {
          label: '清除',
          role: 'danger',
          onPress: async () => {
            let clearSucceeded = false;

            try {
              setUsedSpace('计算中...');
              await clearLocalAppData();
              clearSucceeded = true;
            } catch {
              showErrorFeedback({
                title: '清除失败',
                message: '清理本地数据时发生错误',
                tone: 'error',
                actions: [{ label: '知道了', role: 'primary' }],
              });
              await refreshStorageStats();
              return;
            }

            if (clearSucceeded) {
              let reloadEntriesFailed = false;

              try {
                await useEntryStore.getState().loadEntries();
              } catch {
                reloadEntriesFailed = true;
              }

              await refreshStorageStats();

              if (reloadEntriesFailed) {
                showErrorFeedback({
                  title: '同步未完成',
                  message: '本地数据已清除，但列表刷新失败，请稍后重试。',
                  tone: 'error',
                  actions: [{ label: '知道了', role: 'primary' }],
                });
                return;
              }

              showErrorFeedback({
                title: '成功',
                message: '本地数据已清除',
                tone: 'accent',
                actions: [{ label: '知道了', role: 'primary' }],
              });
            }
          },
        },
      ],
    });
  }, [refreshStorageStats]);

  return {
    usedSpace,
    refreshStorageStats,
    handleClearCache,
  };
}

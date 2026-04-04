import { useCallback, useState } from 'react';
import { getStorageStats } from '@/src/utils/fileSystem';
import { resetAppToInitialState } from '@/src/services/appResetService';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

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
      message: '确定要清除当前设备上的本地数据并恢复到首次打开 APP 时的状态吗？这会清空记录、媒体、设置、登录状态，并将当前服务器地址恢复到默认值。最近使用过的服务器地址会保留。',
      actions: [
        { label: '取消', role: 'secondary' },
        {
          label: '清除',
          role: 'danger',
          onPress: async () => {
            let clearSucceeded = false;

            try {
              setUsedSpace('计算中...');
              await resetAppToInitialState();
              clearSucceeded = true;
            } catch (error) {
              showErrorFeedback({
                title: '恢复失败',
                message: error instanceof Error ? error.message : '恢复初始状态时发生错误',
                tone: 'error',
                actions: [{ label: '知道了', role: 'primary' }],
              });
              await refreshStorageStats();
              return;
            }

            if (clearSucceeded) {
              await refreshStorageStats();

              showErrorFeedback({
                title: '成功',
                message: 'APP 已恢复到初始状态',
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

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { getStorageStats } from '@/src/utils/fileSystem';
import { clearLocalAppData } from '@/src/services/localAppDataService';
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
    Alert.alert('清除缓存', '确定要清除当前设备上的本地记录、媒体和缓存数据吗？后端数据不会受影响。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: async () => {
          try {
            setUsedSpace('计算中...');
            await clearLocalAppData();
            await useEntryStore.getState().loadEntries();
            await refreshStorageStats();
            Alert.alert('成功', '本地数据已清除');
          } catch {
            await refreshStorageStats();
            Alert.alert('清除失败', '清理本地数据时发生错误');
          }
        },
      },
    ]);
  }, [refreshStorageStats]);

  return {
    usedSpace,
    refreshStorageStats,
    handleClearCache,
  };
}

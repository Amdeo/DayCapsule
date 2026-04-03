import { useCallback } from 'react';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';

interface UseSettingsPageDisableCloudModeOptions {
  setCloudMode: (value: boolean | 'switching') => Promise<void>;
}

export function useSettingsPageDisableCloudMode({
  setCloudMode,
}: UseSettingsPageDisableCloudModeOptions) {
  return useCallback(async () => {
    const shown = showConfirmDialog({
      title: '切换到离线模式',
      dismissible: false,
      message: '本地数据将保留，云端数据不受影响。是否继续？',
      actions: [
        {
          label: '切换到离线',
          role: 'primary',
          onPress: () => {
            void setCloudMode(false);
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
    if (!shown) {
      await setCloudMode(true);
    }
  }, [setCloudMode]);
}

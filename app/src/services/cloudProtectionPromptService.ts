import { showConfirmDialog } from '@/src/services/showConfirmDialog';

type PromptEnableCloudProtectionOptions = {
  onEnable: () => void;
  onSkip?: () => void;
};

export function promptEnableCloudProtection(
  options: PromptEnableCloudProtectionOptions,
): boolean {
  return showConfirmDialog({
    title: '开启云同步与备份',
    message: '开启后可将当前数据同步到云端进行备份；当前数据仍以本机为主，后续可随时关闭或调整。',
    dedupeKey: 'enable-cloud-protection',
    actions: [
      {
        label: '暂不启用',
        role: 'secondary',
        onPress: () => {
          options.onSkip?.();
        },
      },
      {
        label: '开启云同步',
        role: 'primary',
        onPress: () => {
          options.onEnable();
        },
      },
    ],
  });
}

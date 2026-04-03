import React from 'react';
import { Switch } from 'react-native';
import { SETTINGS_SWITCH_TRACK_COLORS } from './SettingsPage.styles';
import { SettingButton, SettingItem } from './SettingRow';
import { SettingsGroupCard } from './SettingsGroupCard';
import { SettingsSection } from './SettingsSection';

interface SettingsDataStorageSectionProps {
  highQualityPhotos: boolean;
  onHighQualityPhotosChange: (value: boolean) => void | Promise<void>;
  onOpenTagManagement: () => void;
  onClearCache: () => void;
  onResetSettings: () => void;
}

export function SettingsDataStorageSection({
  highQualityPhotos,
  onHighQualityPhotosChange,
  onOpenTagManagement,
  onClearCache,
  onResetSettings,
}: SettingsDataStorageSectionProps) {
  return (
    <SettingsSection title="数据管理">
      <SettingsGroupCard>
        <SettingItem
          icon="image"
          title="高质量照片"
          subtitle="保存原始质量照片"
          rightComponent={(
            <Switch
              testID="settings-switch-high-quality-photos"
              value={highQualityPhotos}
              onValueChange={onHighQualityPhotosChange}
              trackColor={SETTINGS_SWITCH_TRACK_COLORS}
              thumbColor="#FFFFFF"
            />
          )}
        />
        <SettingButton
          icon="pricetag"
          title="预制标签管理"
          subtitle="管理可快速选择的预制标签"
          testID="settings-open-tag-management"
          onPress={onOpenTagManagement}
        />
        <SettingButton
          icon="trash"
          title="清除缓存"
          subtitle="清空本地记录、媒体和缓存"
          onPress={onClearCache}
        />
        <SettingButton
          icon="refresh"
          title="重置设置"
          subtitle="恢复默认设置"
          onPress={onResetSettings}
          danger
        />
      </SettingsGroupCard>
    </SettingsSection>
  );
}

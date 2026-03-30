import React from 'react';
import { Switch } from 'react-native';
import { SETTINGS_SWITCH_TRACK_COLORS } from './SettingsPage.styles';
import { SettingButton, SettingItem } from './SettingRow';
import { SettingsSection } from './SettingsSection';
import { SettingsStorageInfo } from './SettingsStorageInfo';

interface SettingsDataStorageSectionProps {
  highQualityPhotos: boolean;
  usedSpace: string;
  entryCount: number;
  photoCount: number;
  voiceCount: number;
  onHighQualityPhotosChange: (value: boolean) => void | Promise<void>;
  onClearCache: () => void;
}

export function SettingsDataStorageSection({
  highQualityPhotos,
  usedSpace,
  entryCount,
  photoCount,
  voiceCount,
  onHighQualityPhotosChange,
  onClearCache,
}: SettingsDataStorageSectionProps) {
  return (
    <SettingsSection title="数据与存储">
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
      <SettingsStorageInfo
        usedSpace={usedSpace}
        entryCount={entryCount}
        photoCount={photoCount}
        voiceCount={voiceCount}
      />
      <SettingButton
        icon="trash"
        title="清除缓存"
        subtitle="清空本地记录、媒体和缓存"
        onPress={onClearCache}
      />
    </SettingsSection>
  );
}

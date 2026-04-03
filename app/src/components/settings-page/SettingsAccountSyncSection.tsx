import React from 'react';
import { Switch } from 'react-native';
import { SETTINGS_SWITCH_TRACK_COLORS } from './SettingsPage.styles';
import { SettingButton, SettingItem } from './SettingRow';
import { SettingsGroupCard } from './SettingsGroupCard';
import { SettingsSection } from './SettingsSection';

interface SettingsAccountSyncSectionProps {
  isAuthenticated: boolean;
  userEmail?: string;
  cloudMode: boolean | 'switching';
  isSwitchingMode: boolean;
  onCloudModeToggle: (value: boolean) => void | Promise<void>;
  onShowSyncStatus: () => void | Promise<void>;
  onLogout: () => void;
  onShowLogin: () => void;
}

export function SettingsAccountSyncSection({
  isAuthenticated,
  cloudMode,
  isSwitchingMode,
  onCloudModeToggle,
  onShowSyncStatus,
  onLogout,
  onShowLogin,
}: SettingsAccountSyncSectionProps) {
  return (
    <SettingsSection title="账户与云同步">
      <SettingsGroupCard>
        {isAuthenticated ? (
          <>
            <SettingItem
              icon="cloud"
              title="云端模式"
              subtitle={cloudMode === 'switching' ? '切换中...' : cloudMode ? '数据存储在云端' : '数据存储在本地'}
              rightComponent={(
                <Switch
                  testID="settings-switch-cloud-mode"
                  value={cloudMode === true}
                  onValueChange={onCloudModeToggle}
                  disabled={cloudMode === 'switching' || isSwitchingMode}
                  trackColor={SETTINGS_SWITCH_TRACK_COLORS}
                  thumbColor="#FFFFFF"
                />
              )}
            />
            <SettingButton
              icon="cloud-done"
              title="同步状态"
              subtitle="查看最近同步时间和待同步条数"
              testID="settings-show-sync-status"
              onPress={onShowSyncStatus}
            />
            <SettingButton
              icon="log-out"
              title="退出登录"
              subtitle="退出当前账户"
              onPress={onLogout}
              danger
            />
          </>
        ) : (
          <SettingButton
            icon="person-add"
            title="登录 / 注册"
            subtitle="登录后可使用云端同步功能"
            testID="settings-open-login"
            onPress={onShowLogin}
          />
        )}
      </SettingsGroupCard>
    </SettingsSection>
  );
}

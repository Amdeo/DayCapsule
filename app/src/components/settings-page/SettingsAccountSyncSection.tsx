import React from 'react';
import { Switch } from 'react-native';
import { SETTINGS_SWITCH_TRACK_COLORS } from './SettingsPage.styles';
import { SettingButton, SettingItem } from './SettingRow';
import { SettingsAdvancedSection } from './SettingsAdvancedSection';
import { SettingsGroupCard } from './SettingsGroupCard';
import { SettingsSection } from './SettingsSection';

interface SettingsAccountSyncSectionProps {
  isAuthenticated: boolean;
  cloudMode: boolean | 'switching';
  isSwitchingMode: boolean;
  onCloudModeToggle: (value: boolean) => void | Promise<void>;
  onShowSyncStatus: () => void | Promise<void>;
  onSwitchAccount: () => void;
  onLogout: () => void;
  onShowLogin: () => void;
  currentServerUrl: string;
  backendDraftUrl: string;
  recentServerUrls: string[];
  backendTestStatus: 'idle' | 'testing' | 'success' | 'error';
  backendTestErrorMessage: string | null;
  isSavingBackendServer: boolean;
  canSaveBackendServer: boolean;
  onBackendDraftUrlChange: (value: string) => void;
  onTestBackendServer: () => void | Promise<void>;
  onSaveBackendServer: () => void | Promise<void>;
  onSelectRecentBackendServer: (url: string) => void;
}

export function SettingsAccountSyncSection({
  isAuthenticated,
  cloudMode,
  isSwitchingMode,
  onCloudModeToggle,
  onShowSyncStatus,
  onSwitchAccount,
  onLogout,
  onShowLogin,
  currentServerUrl,
  backendDraftUrl,
  recentServerUrls,
  backendTestStatus,
  backendTestErrorMessage,
  isSavingBackendServer,
  canSaveBackendServer,
  onBackendDraftUrlChange,
  onTestBackendServer,
  onSaveBackendServer,
  onSelectRecentBackendServer,
}: SettingsAccountSyncSectionProps) {
  return (
    <SettingsSection title="账户与云同步">
      <SettingsAdvancedSection
        currentServerUrl={currentServerUrl}
        backendDraftUrl={backendDraftUrl}
        recentServerUrls={recentServerUrls}
        backendTestStatus={backendTestStatus}
        backendTestErrorMessage={backendTestErrorMessage}
        isSavingBackendServer={isSavingBackendServer}
        canSaveBackendServer={canSaveBackendServer}
        onBackendDraftUrlChange={onBackendDraftUrlChange}
        onTestBackendServer={onTestBackendServer}
        onSaveBackendServer={onSaveBackendServer}
        onSelectRecentBackendServer={onSelectRecentBackendServer}
        standalone={false}
        toggleTestID="settings-open-backend-server"
      />
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
              icon="people"
              title="切换账号"
              subtitle="管理和切换已登录的账号"
              onPress={onSwitchAccount}
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

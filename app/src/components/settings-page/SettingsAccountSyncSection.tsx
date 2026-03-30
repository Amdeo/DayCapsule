import React from 'react';
import { Switch } from 'react-native';
import { SETTINGS_SWITCH_TRACK_COLORS } from './SettingsPage.styles';
import { SettingsBackendServerCard } from './SettingsBackendServerCard';
import { SettingButton, SettingItem } from './SettingRow';
import { SettingsSection } from './SettingsSection';

interface SettingsAccountSyncSectionProps {
  isAuthenticated: boolean;
  userEmail?: string;
  cloudMode: boolean | 'switching';
  isSwitchingMode: boolean;
  currentServerUrl: string;
  backendDraftUrl: string;
  recentServerUrls: string[];
  backendTestStatus: 'idle' | 'testing' | 'success' | 'error';
  backendTestErrorMessage: string | null;
  isSavingBackendServer: boolean;
  canSaveBackendServer: boolean;
  onCloudModeToggle: (value: boolean) => void | Promise<void>;
  onShowSyncStatus: () => void | Promise<void>;
  onLogout: () => void;
  onShowLogin: () => void;
  onBackendDraftUrlChange: (value: string) => void;
  onTestBackendServer: () => void | Promise<void>;
  onSaveBackendServer: () => void | Promise<void>;
  onSelectRecentBackendServer: (url: string) => void;
}

export function SettingsAccountSyncSection({
  isAuthenticated,
  userEmail,
  cloudMode,
  isSwitchingMode,
  currentServerUrl,
  backendDraftUrl,
  recentServerUrls,
  backendTestStatus,
  backendTestErrorMessage,
  isSavingBackendServer,
  canSaveBackendServer,
  onCloudModeToggle,
  onShowSyncStatus,
  onLogout,
  onShowLogin,
  onBackendDraftUrlChange,
  onTestBackendServer,
  onSaveBackendServer,
  onSelectRecentBackendServer,
}: SettingsAccountSyncSectionProps) {
  return (
    <SettingsSection title="账户与同步">
      <SettingsBackendServerCard
        currentServerUrl={currentServerUrl}
        draftServerUrl={backendDraftUrl}
        recentServerUrls={recentServerUrls}
        testStatus={backendTestStatus}
        testErrorMessage={backendTestErrorMessage}
        isSaving={isSavingBackendServer}
        canSave={canSaveBackendServer}
        onChangeDraftUrl={onBackendDraftUrlChange}
        onTestConnection={onTestBackendServer}
        onSave={onSaveBackendServer}
        onSelectRecentServer={onSelectRecentBackendServer}
      />
      {isAuthenticated ? (
        <>
          <SettingItem icon="person" title={userEmail ?? '已登录'} subtitle="已登录" />
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
    </SettingsSection>
  );
}

import React from 'react';
import { SettingButton } from './SettingRow';
import { SettingsAdvancedSection } from './SettingsAdvancedSection';
import { SettingsGroupCard } from './SettingsGroupCard';
import { SettingsSection } from './SettingsSection';

interface SettingsAccountSyncSectionProps {
  isAuthenticated: boolean;
  isAccountScopeActive: boolean;
  isTransitioning: boolean;
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
  isAccountScopeActive,
  isTransitioning,
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
            <SettingButton
              icon="cloud-done"
              title="同步状态"
              subtitle={
                isTransitioning
                  ? '账号作用域切换中…'
                  : isAccountScopeActive
                    ? '查看最近同步时间和待同步条数'
                    : '当前不在账号同步作用域'
              }
              testID="settings-show-sync-status"
              onPress={isTransitioning ? () => undefined : onShowSyncStatus}
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

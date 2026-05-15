import React from 'react';
import { SettingButton, SettingItem } from './SettingRow';
import { SettingsAdvancedSection } from './SettingsAdvancedSection';
import { SettingsGroupCard } from './SettingsGroupCard';
import { SettingsSection } from './SettingsSection';

interface SettingsAccountSyncSectionProps {
  isAuthenticated: boolean;
  isCloudProtectionEnabled: boolean;
  isAccountScopeActive: boolean;
  isTransitioning: boolean;
  onEnableCloudProtection?: () => void | Promise<void>;
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
  isCloudProtectionEnabled,
  isAccountScopeActive,
  isTransitioning,
  onEnableCloudProtection,
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
    <SettingsSection title="账户与同步">
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
            {isCloudProtectionEnabled ? (
              <SettingItem
                icon="cloud-done"
                title="云同步与备份已开启"
                subtitle="云端已保护当前记忆"
              />
            ) : (
              <SettingButton
                icon="cloud-upload-outline"
                title="开启云同步与备份"
                subtitle="当前数据仍仅保存在本机"
                testID="settings-enable-cloud-protection"
                onPress={onEnableCloudProtection ?? (() => undefined)}
              />
            )}
            {isCloudProtectionEnabled ? (
              <SettingButton
                icon="cloud-done"
                title="查看同步状态"
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
            ) : null}
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
            title="登录账号"
            subtitle="登录后即可开启云同步与备份"
            testID="settings-open-login"
            onPress={onShowLogin}
          />
        )}
      </SettingsGroupCard>
    </SettingsSection>
  );
}

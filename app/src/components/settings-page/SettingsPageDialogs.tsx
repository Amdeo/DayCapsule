import React from 'react';
import { AboutPage } from '@/src/components/AboutPage';
import { HelpPage } from '@/src/components/HelpPage';
import { LoginPage } from '@/src/components/LoginPage';
import { TagManagementPage } from '@/src/components/TagManagementPage';
import { CloudSyncMonitorHost } from '@/src/components/cloud-sync-monitor/CloudSyncMonitorHost';
import { AccountSwitcherModal } from '@/src/components/account-switcher/AccountSwitcherModal';
import type { AccountEntry, ActiveAccountRef } from '@/src/services/accountRegistryService';

interface SettingsPageDialogsProps {
  showTagMgmt: boolean;
  showLogin: boolean;
  showHelp: boolean;
  showAbout: boolean;
  showAccountSwitcher: boolean;
  accounts: AccountEntry[];
  activeRef: ActiveAccountRef | null;
  isSwitching: boolean;
  onCloseTagManagement: () => void;
  onCloseLogin: () => void;
  onCloseHelp: () => void;
  onCloseAbout: () => void;
  onCloseAccountSwitcher: () => void;
  onLoginSuccess: () => void | Promise<void>;
  onSwitchAccount: (serverUrl: string, userId: string) => Promise<void>;
  onAddAccount: () => void;
}

export function SettingsPageDialogs({
  showTagMgmt,
  showLogin,
  showHelp,
  showAbout,
  showAccountSwitcher,
  accounts,
  activeRef,
  isSwitching,
  onCloseTagManagement,
  onCloseLogin,
  onCloseHelp,
  onCloseAbout,
  onCloseAccountSwitcher,
  onLoginSuccess,
  onSwitchAccount,
  onAddAccount,
}: SettingsPageDialogsProps) {
  return (
    <>
      <CloudSyncMonitorHost />
      <TagManagementPage visible={showTagMgmt} onClose={onCloseTagManagement} />
      <HelpPage visible={showHelp} onClose={onCloseHelp} />
      <AboutPage visible={showAbout} onClose={onCloseAbout} />
      <LoginPage
        visible={showLogin}
        onClose={onCloseLogin}
        onSuccess={onLoginSuccess}
      />
      <AccountSwitcherModal
        visible={showAccountSwitcher}
        accounts={accounts}
        activeRef={activeRef}
        isSwitching={isSwitching}
        onSwitch={onSwitchAccount}
        onAddAccount={onAddAccount}
        onClose={onCloseAccountSwitcher}
      />
    </>
  );
}

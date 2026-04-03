import React from 'react';
import { AboutPage } from '@/src/components/AboutPage';
import { HelpPage } from '@/src/components/HelpPage';
import { LoginPage } from '@/src/components/LoginPage';
import { TagManagementPage } from '@/src/components/TagManagementPage';
import { CloudSyncMonitorHost } from '@/src/components/cloud-sync-monitor/CloudSyncMonitorHost';

interface SettingsPageDialogsProps {
  showTagMgmt: boolean;
  showLogin: boolean;
  showHelp: boolean;
  showAbout: boolean;
  onCloseTagManagement: () => void;
  onCloseLogin: () => void;
  onCloseHelp: () => void;
  onCloseAbout: () => void;
  onLoginSuccess: () => void | Promise<void>;
}

export function SettingsPageDialogs({
  showTagMgmt,
  showLogin,
  showHelp,
  showAbout,
  onCloseTagManagement,
  onCloseLogin,
  onCloseHelp,
  onCloseAbout,
  onLoginSuccess,
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
    </>
  );
}

import React from 'react';
import { AboutPage } from '../AboutPage';
import { HelpPage } from '../HelpPage';
import { LoginPage } from '../LoginPage';
import { TagManagementPage } from '../TagManagementPage';

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

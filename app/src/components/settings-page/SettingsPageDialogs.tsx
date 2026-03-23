import React from 'react';
import { LoginPage } from '../LoginPage';
import { TagManagementPage } from '../TagManagementPage';

interface SettingsPageDialogsProps {
  showTagMgmt: boolean;
  showLogin: boolean;
  onCloseTagManagement: () => void;
  onCloseLogin: () => void;
  onLoginSuccess: () => void | Promise<void>;
}

export function SettingsPageDialogs({
  showTagMgmt,
  showLogin,
  onCloseTagManagement,
  onCloseLogin,
  onLoginSuccess,
}: SettingsPageDialogsProps) {
  return (
    <>
      <TagManagementPage visible={showTagMgmt} onClose={onCloseTagManagement} />
      <LoginPage
        visible={showLogin}
        onClose={onCloseLogin}
        onSuccess={onLoginSuccess}
      />
    </>
  );
}

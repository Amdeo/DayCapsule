/**
 * 登录/注册页面
 */

import React from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { DetailPageShell } from './DetailPageShell';
import { LoginPageForm } from './login-page/LoginPageForm';
import { useLoginPageController } from './login-page/useLoginPageController';

interface LoginPageProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginPage({ visible, onClose, onSuccess }: LoginPageProps) {
  const { login, register } = useAuthStore();
  const controller = useLoginPageController({
    login,
    onSuccess,
    register,
  });

  return (
    <DetailPageShell
      visible={visible}
      title={controller.isRegister ? '注册' : '登录'}
      onClose={onClose}
    >
      <LoginPageForm {...controller} />
    </DetailPageShell>
  );
}

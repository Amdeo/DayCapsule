import { useCallback, useState } from 'react';
import { buildLoginFailedFeedback } from '@/src/services/errorFeedbackPresets';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { logger } from '@/src/utils/logger';

interface UseLoginPageControllerProps {
  login: (email: string, password: string) => Promise<void>;
  onSuccess: () => void;
  register: (email: string, password: string) => Promise<void>;
}

interface LoginPageController {
  isRegister: boolean;
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onSubmit: () => Promise<void>;
  onToggleMode: () => void;
}

export function useLoginPageController({ login, onSuccess, register }: UseLoginPageControllerProps): LoginPageController {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsLoading(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      showErrorFeedback({
        title: '提示',
        message: '请填写邮箱和密码',
        actions: [{ label: '知道了', role: 'primary' }],
      });
      return;
    }

    if (isRegister && password !== confirmPassword) {
      showErrorFeedback({
        title: '提示',
        message: '两次输入的密码不一致',
        actions: [{ label: '知道了', role: 'primary' }],
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        await register(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      resetForm();
      onSuccess();
    } catch (e: any) {
      logger.warn('[LoginPage] Auth failed:', e);
      showErrorFeedback(buildLoginFailedFeedback(e, isRegister));
    } finally {
      setIsLoading(false);
    }
  }, [confirmPassword, email, isRegister, login, onSuccess, register, resetForm, password]);

  const handleToggleMode = useCallback(() => {
    setIsRegister((prev) => !prev);
    setConfirmPassword('');
  }, []);

  return {
    isRegister,
    email,
    password,
    confirmPassword,
    isLoading,
    onChangeEmail: setEmail,
    onChangePassword: setPassword,
    onChangeConfirmPassword: setConfirmPassword,
    onSubmit: handleSubmit,
    onToggleMode: handleToggleMode,
  };
}

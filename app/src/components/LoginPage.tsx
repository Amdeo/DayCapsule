/**
 * 登录/注册页面
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/src/store/authStore';
import { DetailPageShell } from './DetailPageShell';
import { logger } from '@/src/utils/logger';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { buildLoginFailedFeedback } from '@/src/services/errorFeedbackPresets';

interface LoginPageProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginPage({ visible, onClose, onSuccess }: LoginPageProps) {
  const { login, register } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('提示', '请填写邮箱和密码');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
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
      logger.error('[LoginPage] Auth failed:', e);
      showErrorFeedback(buildLoginFailedFeedback(e, isRegister));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DetailPageShell visible={visible} title={isRegister ? '注册' : '登录'} onClose={onClose}>
      <View className="gap-4 pt-6" testID="login-page-root">
        <TextInput
          className="rounded-chip bg-neutral-100 px-4 py-[14px] text-base text-copy-primary"
          placeholder="邮箱"
          placeholderTextColor="#A3A3A3"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          className="rounded-chip bg-neutral-100 px-4 py-[14px] text-base text-copy-primary"
          placeholder="密码"
          placeholderTextColor="#A3A3A3"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {isRegister && (
          <TextInput
            className="rounded-chip bg-neutral-100 px-4 py-[14px] text-base text-copy-primary"
            placeholder="确认密码"
            placeholderTextColor="#A3A3A3"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        {isRegister && (
          <Text className="px-1 text-xs text-copy-muted">
            密码要求：8-64位，含大小写字母和数字
          </Text>
        )}

        <TouchableOpacity
          className={`mt-2 items-center rounded-chip py-[14px] ${
            isLoading ? 'bg-neutral-300' : 'bg-primary'
          }`}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {isRegister ? '注册' : '登录'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center py-3"
          onPress={() => {
            setIsRegister(!isRegister);
            setConfirmPassword('');
          }}
        >
          <Text className="text-sm text-primary">
            {isRegister ? '已有账户？登录' : '没有账户？注册'}
          </Text>
        </TouchableOpacity>
      </View>
    </DetailPageShell>
  );
}

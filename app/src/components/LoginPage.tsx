/**
 * 登录/注册页面
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
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
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="邮箱"
          placeholderTextColor="#A3A3A3"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="密码"
          placeholderTextColor="#A3A3A3"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="确认密码"
            placeholderTextColor="#A3A3A3"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        {isRegister && (
          <Text style={styles.hint}>密码要求：8-64位，含大小写字母和数字</Text>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{isRegister ? '注册' : '登录'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setIsRegister(!isRegister);
            setConfirmPassword('');
          }}
        >
          <Text style={styles.switchText}>
            {isRegister ? '已有账户？登录' : '没有账户？注册'}
          </Text>
        </TouchableOpacity>
      </View>
    </DetailPageShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 24, gap: 16 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#4A4A4A',
  },
  hint: { fontSize: 12, color: '#A3A3A3', paddingHorizontal: 4 },
  button: {
    backgroundColor: '#6A89CC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#D1D1D1' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  switchButton: { alignItems: 'center', paddingVertical: 12 },
  switchText: { fontSize: 14, color: '#6A89CC' },
});

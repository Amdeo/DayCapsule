import React from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { loginPageStyles as styles } from './LoginPage.styles';

interface LoginPageFormProps {
  isRegister: boolean;
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
}

export function LoginPageForm({
  isRegister,
  email,
  password,
  confirmPassword,
  isLoading,
  onChangeEmail,
  onChangePassword,
  onChangeConfirmPassword,
  onSubmit,
  onToggleMode,
}: LoginPageFormProps) {
  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        placeholder="邮箱"
        placeholderTextColor="#A3A3A3"
        value={email}
        onChangeText={onChangeEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="密码"
        placeholderTextColor="#A3A3A3"
        value={password}
        onChangeText={onChangePassword}
        secureTextEntry
      />
      {isRegister ? (
        <TextInput
          style={styles.input}
          placeholder="确认密码"
          placeholderTextColor="#A3A3A3"
          value={confirmPassword}
          onChangeText={onChangeConfirmPassword}
          secureTextEntry
        />
      ) : null}

      {isRegister ? (
        <Text style={styles.hint}>密码要求：8-64位，含大小写字母和数字</Text>
      ) : null}

      <TouchableOpacity
        testID="login-page-submit-button"
        accessibilityState={{ disabled: isLoading }}
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={isLoading}
      >
        <View testID="login-page-submit-button-target">
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{isRegister ? '注册' : '登录'}</Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchButton} onPress={onToggleMode}>
        <Text style={styles.switchText}>
          {isRegister ? '已有账户？登录' : '没有账户？注册'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

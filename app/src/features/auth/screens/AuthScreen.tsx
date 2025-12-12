/**
 * 认证页面组件
 * 支持生物识别和密码认证
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

/**
 * 认证页面组件
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({onAuthSuccess}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // 模拟生物识别认证
  const handleBiometricAuth = async () => {
    setIsLoading(true);
    try {
      // 这里应该调用实际的生物识别API
      // 现在使用模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 模拟认证成功
      onAuthSuccess?.();
    } catch (error) {
      Alert.alert('认证失败', '生物识别认证失败，请重试或使用密码');
    } finally {
      setIsLoading(false);
    }
  };

  // 模拟密码认证
  const handlePasswordAuth = () => {
    Alert.alert(
      '密码认证',
      '密码认证功能暂未实现，请使用生物识别',
      [{text: '确定', style: 'default'}]
    );
  };

  // 组件加载时自动尝试生物识别
  useEffect(() => {
    // 延迟1秒后自动尝试生物识别
    const timer = setTimeout(() => {
      handleBiometricAuth();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* 应用图标和标题 */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, {backgroundColor: theme.colors.primaryContainer}]}>
                <Text style={styles.icon}>🔒</Text>
              </View>
              <Text style={[styles.title, {color: theme.colors.onBackground}]}>
                MemoryCapsule
              </Text>
              <Text style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>
                您的私人记忆宝库
              </Text>
            </View>

            {/* 认证说明 */}
            <View style={styles.instructionContainer}>
              <Text style={[styles.instructionText, {color: theme.colors.onSurface}]}>
                请验证您的身份以访问应用
              </Text>
            </View>

            {/* 认证按钮 */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.biometricButton,
                  {
                    backgroundColor: isLoading
                      ? theme.colors.surfaceVariant
                      : theme.colors.primary,
                  },
                ]}
                onPress={handleBiometricAuth}
                disabled={isLoading}>
                <Text style={[
                  styles.biometricButtonText,
                  {color: theme.colors.onPrimary}
                ]}>
                  {isLoading ? '正在验证...' : '使用生物识别'}
                </Text>
                <Text style={styles.biometricIcon}>👆</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.passwordButton,
                  {borderColor: theme.colors.outline}
                ]}
                onPress={handlePasswordAuth}
                disabled={isLoading}>
                <Text style={[
                  styles.passwordButtonText,
                  {color: theme.colors.onSurface}
                ]}>
                  使用密码
                </Text>
                <Text style={styles.passwordIcon}>🔑</Text>
              </TouchableOpacity>
            </View>

            {/* 安全提示 */}
            <View style={[styles.securityTip, {backgroundColor: theme.colors.surfaceVariant}]}>
              <Text style={styles.securityTipIcon}>🛡️</Text>
              <Text style={[styles.securityTipText, {color: theme.colors.onSurfaceVariant}]}>
                您的数据在本地加密存储，只有您才能访问
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  instructionContainer: {
    marginBottom: 48,
  },
  instructionText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  buttonContainer: {
    marginBottom: 32,
    gap: 16,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  biometricIcon: {
    fontSize: 20,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  passwordButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  passwordIcon: {
    fontSize: 20,
  },
  securityTip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityTipIcon: {
    fontSize: 16,
  },
  securityTipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default AuthScreen;
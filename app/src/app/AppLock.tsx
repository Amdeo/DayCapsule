import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {biometricAuthService} from '@services/security/biometricAuth';
import {passwordAuthService} from '@services/security/passwordAuth';
import {logger} from '@services/telemetry/logger';

interface AppLockProps {
  isLocked: boolean;
  onUnlock: () => void;
  lockType: 'biometric' | 'password' | 'both';
}

export const AppLock: React.FC<AppLockProps> = ({
  isLocked,
  onUnlock,
  lockType,
}) => {
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // 处理生物识别认证
  const handleBiometricAuth = async () => {
    try {
      setIsAuthenticating(true);
      setError(null);

      const result = await biometricAuthService.authenticate();

      if (result.success) {
        logger.info('Biometric authentication succeeded');
        onUnlock();
      } else {
        setError(result.error || '生物识别认证失败');
        setAttemptCount(prev => prev + 1);
      }
    } catch (error) {
      logger.error('Biometric authentication error', {error});
      setError('生物识别认证出错');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 处理密码认证
  const handlePasswordAuth = async () => {
    try {
      if (!password) {
        setError('请输入密码');
        return;
      }

      setIsAuthenticating(true);
      setError(null);

      const result = await passwordAuthService.verifyPassword(password);

      if (result.success) {
        logger.info('Password authentication succeeded');
        setPassword('');
        onUnlock();
      } else {
        setError(result.error || '密码错误');
        setAttemptCount(prev => prev + 1);
        setPassword('');
      }
    } catch (error) {
      logger.error('Password authentication error', {error});
      setError('密码认证出错');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 处理回车键
  const handlePasswordSubmit = () => {
    handlePasswordAuth();
  };

  if (!isLocked) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.lockScreen}>
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.title}>应用已锁定</Text>
          <Text style={styles.subtitle}>请进行身份验证以继续</Text>
        </View>

        {/* 认证方式 */}
        <View style={styles.authContainer}>
          {/* 生物识别 */}
          {(lockType === 'biometric' || lockType === 'both') && (
            <TouchableOpacity
              style={styles.authButton}
              onPress={handleBiometricAuth}
              disabled={isAuthenticating}
              testID="biometric_auth_button"
            >
              {isAuthenticating ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : (
                <>
                  <Text style={styles.authIcon}>👆</Text>
                  <Text style={styles.authButtonText}>生物识别</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* 密码 */}
          {(lockType === 'password' || lockType === 'both') && (
            <View style={styles.passwordContainer}>
              <Text style={styles.passwordLabel}>输入密码</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="请输入密码"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handlePasswordSubmit}
                editable={!isAuthenticating}
                testID="password_input"
              />
              <TouchableOpacity
                style={styles.passwordButton}
                onPress={handlePasswordAuth}
                disabled={isAuthenticating || !password}
                testID="password_auth_button"
              >
                {isAuthenticating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.passwordButtonText}>验证</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 错误信息 */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {attemptCount > 0 && (
              <Text style={styles.attemptText}>
                失败次数: {attemptCount}
              </Text>
            )}
          </View>
        )}

        {/* 底部信息 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            为了保护您的隐私，应用已锁定
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  lockScreen: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  authButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordContainer: {
    gap: 12,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  passwordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  passwordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '500',
  },
  attemptText: {
    color: '#c62828',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});


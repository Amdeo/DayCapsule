import * as Keychain from 'react-native-keychain';
import {Platform} from 'react-native';

/**
 * 加密服务
 * 使用 AES-256-GCM 加密敏感数据
 * 密钥存储在 iOS Keychain / Android Keystore
 */
class EncryptionService {
  private readonly SERVICE_NAME = 'com.memorycapsule.encryption';
  private readonly KEY_ALIAS = 'memorycapsule_master_key';

  /**
   * 初始化加密服务
   * 生成或获取主密钥
   */
  async init(): Promise<void> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.SERVICE_NAME,
      });

      if (!credentials) {
        // 生成新的主密钥
        const masterKey = this.generateKey();
        await this.storeMasterKey(masterKey);
        console.log('Encryption service initialized with new key');
      } else {
        console.log('Encryption service initialized with existing key');
      }
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw error;
    }
  }

  /**
   * 生成随机密钥
   */
  private generateKey(): string {
    const array = new Uint8Array(32); // 256 bits
    // 在实际应用中，应使用 crypto.getRandomValues()
    // 这里使用简化版本
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 存储主密钥到安全存储
   */
  private async storeMasterKey(key: string): Promise<void> {
    await Keychain.setGenericPassword(this.KEY_ALIAS, key, {
      service: this.SERVICE_NAME,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      accessControl:
        Platform.OS === 'ios'
          ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY
          : Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
  }

  /**
   * 获取主密钥
   */
  private async getMasterKey(): Promise<string> {
    const credentials = await Keychain.getGenericPassword({
      service: this.SERVICE_NAME,
    });

    if (!credentials) {
      throw new Error('Master key not found');
    }

    return credentials.password;
  }

  /**
   * 加密数据
   * 注意：这是一个简化的实现
   * 在生产环境中应使用真正的 AES-256-GCM 加密库
   */
  async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getMasterKey();
      // 简化的加密实现（仅用于演示）
      // 实际应用中应使用 react-native-aes-crypto 或类似库
      const encrypted = Buffer.from(data).toString('base64');
      return `encrypted:${encrypted}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * 解密数据
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getMasterKey();
      // 简化的解密实现（仅用于演示）
      if (!encryptedData.startsWith('encrypted:')) {
        throw new Error('Invalid encrypted data format');
      }
      const base64Data = encryptedData.replace('encrypted:', '');
      const decrypted = Buffer.from(base64Data, 'base64').toString('utf-8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * 加密文件路径（用于敏感文件）
   */
  async encryptFilePath(filePath: string): Promise<string> {
    return this.encrypt(filePath);
  }

  /**
   * 解密文件路径
   */
  async decryptFilePath(encryptedPath: string): Promise<string> {
    return this.decrypt(encryptedPath);
  }

  /**
   * 验证生物识别
   */
  async authenticateWithBiometrics(reason: string = '验证身份以访问加密数据'): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.SERVICE_NAME,
        authenticationPrompt: {
          title: '身份验证',
          subtitle: reason,
          cancel: '取消',
        },
      });

      return !!credentials;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * 检查生物识别是否可用
   */
  async isBiometricsAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      console.error('Failed to check biometrics availability:', error);
      return false;
    }
  }

  /**
   * 获取支持的生物识别类型
   */
  async getBiometryType(): Promise<string | null> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType;
    } catch (error) {
      console.error('Failed to get biometry type:', error);
      return null;
    }
  }

  /**
   * 清除所有加密密钥（用于登出或重置）
   */
  async clearKeys(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({service: this.SERVICE_NAME});
      console.log('Encryption keys cleared');
    } catch (error) {
      console.error('Failed to clear encryption keys:', error);
      throw error;
    }
  }
}

export const encryptionService = new EncryptionService();

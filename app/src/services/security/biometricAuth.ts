import {logger} from '@services/telemetry/logger';

export type BiometricType = 'fingerprint' | 'faceRecognition' | 'iris';

export interface BiometricAuthResult {
  success: boolean;
  biometricType?: BiometricType;
  error?: string;
  timestamp: number;
}

export interface BiometricConfig {
  enabled: boolean;
  timeout: number; // 毫秒
  maxAttempts: number;
  lockoutDuration: number; // 毫秒
}

/**
 * 生物识别锁定服务
 * 支持指纹、面部识别等生物识别方式
 */
export class BiometricAuthService {
  private config: BiometricConfig = {
    enabled: false,
    timeout: 30000, // 30 秒
    maxAttempts: 5,
    lockoutDuration: 300000, // 5 分钟
  };

  private failedAttempts: number = 0;
  private isLockedOut: boolean = false;
  private lockoutTimer: NodeJS.Timeout | null = null;
  private availableBiometrics: BiometricType[] = [];

  constructor(config?: Partial<BiometricConfig>) {
    if (config) {
      this.config = {...this.config, ...config};
    }
    this.initializeBiometrics();
  }

  /**
   * 初始化生物识别
   */
  private initializeBiometrics(): void {
    try {
      // 模拟检测可用的生物识别方式
      this.availableBiometrics = ['fingerprint', 'faceRecognition'];
      logger.info('Biometric authentication initialized', {
        available: this.availableBiometrics,
      });
    } catch (error) {
      logger.error('Failed to initialize biometric authentication', {error});
    }
  }

  /**
   * 检查是否支持生物识别
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      return this.availableBiometrics.length > 0;
    } catch (error) {
      logger.error('Failed to check biometric availability', {error});
      return false;
    }
  }

  /**
   * 获取可用的生物识别类型
   */
  async getAvailableBiometrics(): Promise<BiometricType[]> {
    return [...this.availableBiometrics];
  }

  /**
   * 进行生物识别认证
   */
  async authenticate(): Promise<BiometricAuthResult> {
    try {
      // 检查是否被锁定
      if (this.isLockedOut) {
        throw new Error('Too many failed attempts. Please try again later.');
      }

      // 检查是否支持生物识别
      if (!this.config.enabled || this.availableBiometrics.length === 0) {
        throw new Error('Biometric authentication is not available');
      }

      logger.info('Starting biometric authentication');

      // 模拟生物识别认证
      const result = await this.simulateAuthentication();

      if (result) {
        // 认证成功，重置失败计数
        this.failedAttempts = 0;
        logger.info('Biometric authentication succeeded');

        return {
          success: true,
          biometricType: 'fingerprint',
          timestamp: Date.now(),
        };
      } else {
        // 认证失败，增加失败计数
        this.failedAttempts++;

        if (this.failedAttempts >= this.config.maxAttempts) {
          this.lockout();
          throw new Error('Too many failed attempts. Account locked.');
        }

        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Biometric authentication failed', {error: errorMessage});

      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 模拟生物识别认证
   */
  private async simulateAuthentication(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟 90% 的成功率
        if (Math.random() > 0.1) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    });
  }

  /**
   * 锁定账户
   */
  private lockout(): void {
    this.isLockedOut = true;
    logger.warn('Biometric authentication locked out', {
      duration: this.config.lockoutDuration,
    });

    this.lockoutTimer = setTimeout(() => {
      this.isLockedOut = false;
      this.failedAttempts = 0;
      logger.info('Biometric authentication lockout expired');
    }, this.config.lockoutDuration);
  }

  /**
   * 启用生物识别
   */
  async enableBiometric(): Promise<boolean> {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) {
        throw new Error('Biometric authentication is not available on this device');
      }

      this.config.enabled = true;
      logger.info('Biometric authentication enabled');
      return true;
    } catch (error) {
      logger.error('Failed to enable biometric authentication', {error});
      return false;
    }
  }

  /**
   * 禁用生物识别
   */
  disableBiometric(): void {
    this.config.enabled = false;
    this.failedAttempts = 0;
    logger.info('Biometric authentication disabled');
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 检查是否被锁定
   */
  isLocked(): boolean {
    return this.isLockedOut;
  }

  /**
   * 获取失败次数
   */
  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  /**
   * 重置失败计数
   */
  resetFailedAttempts(): void {
    this.failedAttempts = 0;
    logger.info('Failed attempts reset');
  }

  /**
   * 获取配置
   */
  getConfig(): BiometricConfig {
    return {...this.config};
  }

  /**
   * 更新配置
   */
  setConfig(config: Partial<BiometricConfig>): void {
    this.config = {...this.config, ...config};
    logger.info('Biometric auth config updated', {config: this.config});
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.lockoutTimer) {
      clearTimeout(this.lockoutTimer);
    }
    logger.info('Biometric auth service destroyed');
  }
}

// 导出单例
export const biometricAuthService = new BiometricAuthService({
  enabled: false,
  timeout: 30000,
  maxAttempts: 5,
  lockoutDuration: 300000,
});


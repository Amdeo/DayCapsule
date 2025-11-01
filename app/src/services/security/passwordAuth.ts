import {logger} from '@services/telemetry/logger';
import * as Crypto from 'expo-crypto';

export interface PasswordAuthResult {
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface PasswordConfig {
  enabled: boolean;
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAttempts: number;
  lockoutDuration: number; // 毫秒
}

/**
 * 密码锁定服务
 * 支持密码设置、验证和安全存储
 */
export class PasswordAuthService {
  private config: PasswordConfig = {
    enabled: false,
    minLength: 6,
    requireUppercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
    maxAttempts: 5,
    lockoutDuration: 300000, // 5 分钟
  };

  private passwordHash: string | null = null;
  private failedAttempts: number = 0;
  private isLockedOut: boolean = false;
  private lockoutTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<PasswordConfig>) {
    if (config) {
      this.config = {...this.config, ...config};
    }
    logger.info('Password auth service initialized', {config: this.config});
  }

  /**
   * 设置密码
   */
  async setPassword(password: string): Promise<boolean> {
    try {
      // 验证密码强度
      if (!this.validatePasswordStrength(password)) {
        throw new Error('Password does not meet security requirements');
      }

      // 哈希密码
      this.passwordHash = await this.hashPassword(password);

      logger.info('Password set successfully');
      this.config.enabled = true;
      return true;
    } catch (error) {
      logger.error('Failed to set password', {error});
      return false;
    }
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string): Promise<PasswordAuthResult> {
    try {
      // 检查是否被锁定
      if (this.isLockedOut) {
        throw new Error('Too many failed attempts. Please try again later.');
      }

      // 检查是否启用
      if (!this.config.enabled || !this.passwordHash) {
        throw new Error('Password authentication is not enabled');
      }

      logger.info('Verifying password');

      // 哈希输入的密码
      const inputHash = await this.hashPassword(password);

      // 比较哈希值
      if (inputHash === this.passwordHash) {
        // 验证成功，重置失败计数
        this.failedAttempts = 0;
        logger.info('Password verification succeeded');

        return {
          success: true,
          timestamp: Date.now(),
        };
      } else {
        // 验证失败，增加失败计数
        this.failedAttempts++;

        if (this.failedAttempts >= this.config.maxAttempts) {
          this.lockout();
          throw new Error('Too many failed attempts. Account locked.');
        }

        throw new Error('Password verification failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Password verification failed', {error: errorMessage});

      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 验证密码强度
   */
  private validatePasswordStrength(password: string): boolean {
    // 检查最小长度
    if (password.length < this.config.minLength) {
      return false;
    }

    // 检查大写字母
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }

    // 检查数字
    if (this.config.requireNumbers && !/[0-9]/.test(password)) {
      return false;
    }

    // 检查特殊字符
    if (this.config.requireSpecialChars && !/[!@#$%^&*]/.test(password)) {
      return false;
    }

    return true;
  }

  /**
   * 获取密码强度提示
   */
  getPasswordStrengthHint(password: string): string {
    if (password.length < this.config.minLength) {
      return `密码至少需要 ${this.config.minLength} 个字符`;
    }

    const hints: string[] = [];

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      hints.push('需要至少一个大写字母');
    }

    if (this.config.requireNumbers && !/[0-9]/.test(password)) {
      hints.push('需要至少一个数字');
    }

    if (this.config.requireSpecialChars && !/[!@#$%^&*]/.test(password)) {
      hints.push('需要至少一个特殊字符');
    }

    return hints.length > 0 ? hints.join('，') : '密码强度良好';
  }

  /**
   * 哈希密码
   */
  private async hashPassword(password: string): Promise<string> {
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
      );
      return hash;
    } catch (error) {
      logger.error('Failed to hash password', {error});
      throw error;
    }
  }

  /**
   * 锁定账户
   */
  private lockout(): void {
    this.isLockedOut = true;
    logger.warn('Password authentication locked out', {
      duration: this.config.lockoutDuration,
    });

    this.lockoutTimer = setTimeout(() => {
      this.isLockedOut = false;
      this.failedAttempts = 0;
      logger.info('Password authentication lockout expired');
    }, this.config.lockoutDuration);
  }

  /**
   * 启用密码
   */
  enablePassword(): void {
    if (this.passwordHash) {
      this.config.enabled = true;
      logger.info('Password authentication enabled');
    }
  }

  /**
   * 禁用密码
   */
  disablePassword(): void {
    this.config.enabled = false;
    this.failedAttempts = 0;
    logger.info('Password authentication disabled');
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled && this.passwordHash !== null;
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
  getConfig(): PasswordConfig {
    return {...this.config};
  }

  /**
   * 更新配置
   */
  setConfig(config: Partial<PasswordConfig>): void {
    this.config = {...this.config, ...config};
    logger.info('Password auth config updated', {config: this.config});
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.lockoutTimer) {
      clearTimeout(this.lockoutTimer);
    }
    this.passwordHash = null;
    logger.info('Password auth service destroyed');
  }
}

// 导出单例
export const passwordAuthService = new PasswordAuthService({
  enabled: false,
  minLength: 6,
  requireUppercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  maxAttempts: 5,
  lockoutDuration: 300000,
});


import {logger} from '@services/telemetry/logger';

export interface KeyInfo {
  id: string;
  version: number;
  createdAt: number;
  expiresAt: number;
  algorithm: string;
  status: 'active' | 'inactive' | 'expired';
}

export interface KeyRotationConfig {
  enabled: boolean;
  rotationInterval: number; // 毫秒
  keyLifetime: number; // 毫秒
  maxKeyVersions: number;
  autoRotate: boolean;
}

/**
 * 密钥轮换策略服务
 * 管理加密密钥的生命周期和轮换
 */
export class KeyRotationService {
  private config: KeyRotationConfig = {
    enabled: true,
    rotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 天
    keyLifetime: 90 * 24 * 60 * 60 * 1000, // 90 天
    maxKeyVersions: 5,
    autoRotate: true,
  };

  private keys: Map<string, KeyInfo> = new Map();
  private rotationTimer: NodeJS.Timeout | null = null;
  private currentKeyVersion: number = 1;

  constructor(config?: Partial<KeyRotationConfig>) {
    if (config) {
      this.config = {...this.config, ...config};
    }
    this.initializeKeyRotation();
  }

  /**
   * 初始化密钥轮换
   */
  private initializeKeyRotation(): void {
    try {
      // 创建初始密钥
      this.createKey();

      // 启动自动轮换
      if (this.config.autoRotate) {
        this.startAutoRotation();
      }

      logger.info('Key rotation service initialized', {config: this.config});
    } catch (error) {
      logger.error('Failed to initialize key rotation', {error});
    }
  }

  /**
   * 创建新密钥
   */
  private createKey(): string {
    try {
      const keyId = `key_${this.currentKeyVersion}_${Date.now()}`;
      const now = Date.now();

      const keyInfo: KeyInfo = {
        id: keyId,
        version: this.currentKeyVersion,
        createdAt: now,
        expiresAt: now + this.config.keyLifetime,
        algorithm: 'AES-256-GCM',
        status: 'active',
      };

      this.keys.set(keyId, keyInfo);
      this.currentKeyVersion++;

      logger.info('New key created', {
        keyId,
        version: keyInfo.version,
      });

      // 清理过期密钥
      this.cleanupExpiredKeys();

      return keyId;
    } catch (error) {
      logger.error('Failed to create key', {error});
      throw error;
    }
  }

  /**
   * 启动自动轮换
   */
  private startAutoRotation(): void {
    this.rotationTimer = setInterval(() => {
      this.rotateKey();
    }, this.config.rotationInterval);

    logger.info('Auto key rotation started', {
      interval: this.config.rotationInterval,
    });
  }

  /**
   * 轮换密钥
   */
  async rotateKey(): Promise<string> {
    try {
      logger.info('Starting key rotation');

      // 标记旧密钥为非活跃
      this.keys.forEach(key => {
        if (key.status === 'active') {
          key.status = 'inactive';
        }
      });

      // 创建新密钥
      const newKeyId = this.createKey();

      logger.info('Key rotation completed', {newKeyId});

      return newKeyId;
    } catch (error) {
      logger.error('Failed to rotate key', {error});
      throw error;
    }
  }

  /**
   * 获取当前活跃密钥
   */
  getActiveKey(): KeyInfo | null {
    for (const key of this.keys.values()) {
      if (key.status === 'active') {
        return key;
      }
    }
    return null;
  }

  /**
   * 获取密钥
   */
  getKey(keyId: string): KeyInfo | null {
    return this.keys.get(keyId) || null;
  }

  /**
   * 获取所有密钥
   */
  getAllKeys(): KeyInfo[] {
    return Array.from(this.keys.values());
  }

  /**
   * 获取有效密钥
   */
  getValidKeys(): KeyInfo[] {
    const now = Date.now();
    return Array.from(this.keys.values()).filter(
      key => key.expiresAt > now && key.status !== 'expired',
    );
  }

  /**
   * 清理过期密钥
   */
  private cleanupExpiredKeys(): void {
    try {
      const now = Date.now();
      const keysToDelete: string[] = [];

      this.keys.forEach((key, keyId) => {
        if (key.expiresAt <= now) {
          key.status = 'expired';
          keysToDelete.push(keyId);
        }
      });

      // 保持最多 maxKeyVersions 个密钥
      if (this.keys.size > this.config.maxKeyVersions) {
        const sortedKeys = Array.from(this.keys.entries())
          .sort((a, b) => b[1].createdAt - a[1].createdAt)
          .slice(this.config.maxKeyVersions);

        sortedKeys.forEach(([keyId]) => {
          this.keys.delete(keyId);
          logger.info('Old key deleted', {keyId});
        });
      }

      if (keysToDelete.length > 0) {
        logger.info('Expired keys cleaned up', {count: keysToDelete.length});
      }
    } catch (error) {
      logger.error('Failed to cleanup expired keys', {error});
    }
  }

  /**
   * 检查密钥是否需要轮换
   */
  shouldRotateKey(): boolean {
    const activeKey = this.getActiveKey();
    if (!activeKey) {
      return true;
    }

    const age = Date.now() - activeKey.createdAt;
    return age > this.config.rotationInterval;
  }

  /**
   * 获取下次轮换时间
   */
  getNextRotationTime(): number {
    const activeKey = this.getActiveKey();
    if (!activeKey) {
      return Date.now();
    }

    return activeKey.createdAt + this.config.rotationInterval;
  }

  /**
   * 获取配置
   */
  getConfig(): KeyRotationConfig {
    return {...this.config};
  }

  /**
   * 更新配置
   */
  setConfig(config: Partial<KeyRotationConfig>): void {
    this.config = {...this.config, ...config};
    logger.info('Key rotation config updated', {config: this.config});
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalKeys: number;
    activeKeys: number;
    inactiveKeys: number;
    expiredKeys: number;
    currentVersion: number;
  } {
    const stats = {
      totalKeys: this.keys.size,
      activeKeys: 0,
      inactiveKeys: 0,
      expiredKeys: 0,
      currentVersion: this.currentKeyVersion,
    };

    this.keys.forEach(key => {
      switch (key.status) {
        case 'active':
          stats.activeKeys++;
          break;
        case 'inactive':
          stats.inactiveKeys++;
          break;
        case 'expired':
          stats.expiredKeys++;
          break;
      }
    });

    return stats;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    logger.info('Key rotation service destroyed');
  }
}

// 导出单例
export const keyRotationService = new KeyRotationService({
  enabled: true,
  rotationInterval: 30 * 24 * 60 * 60 * 1000,
  keyLifetime: 90 * 24 * 60 * 60 * 1000,
  maxKeyVersions: 5,
  autoRotate: true,
});


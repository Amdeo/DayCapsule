import {logger} from '@services/telemetry/logger';
import RNFS from 'react-native-fs';

export interface StorageInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  usagePercentage: number;
}

export interface StorageBreakdown {
  database: number;
  media: number;
  cache: number;
  other: number;
}

export interface StorageAlert {
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
  usagePercentage: number;
}

/**
 * 空间监控服务
 * 监控设备存储空间使用情况
 */
export class StorageMonitorService {
  private warningThreshold: number = 0.8; // 80%
  private criticalThreshold: number = 0.95; // 95%
  private monitorInterval: number = 60000; // 1 分钟
  private monitorTimer: NodeJS.Timeout | null = null;
  private alerts: StorageAlert[] = [];
  private listeners: Set<(alert: StorageAlert) => void> = new Set();

  constructor() {
    this.startMonitoring();
  }

  /**
   * 启动监控
   */
  private startMonitoring(): void {
    this.monitorTimer = setInterval(() => {
      this.checkStorageUsage();
    }, this.monitorInterval);
    logger.info('Storage monitoring started', {interval: this.monitorInterval});
  }

  /**
   * 检查存储使用情况
   */
  private async checkStorageUsage(): Promise<void> {
    try {
      const storageInfo = await this.getStorageInfo();
      const usagePercentage = storageInfo.usagePercentage;

      if (usagePercentage >= this.criticalThreshold) {
        this.addAlert({
          type: 'critical',
          message: `存储空间即将满满（${(usagePercentage * 100).toFixed(1)}%）`,
          usagePercentage,
        });
      } else if (usagePercentage >= this.warningThreshold) {
        this.addAlert({
          type: 'warning',
          message: `存储空间即将不足（${(usagePercentage * 100).toFixed(1)}%）`,
          usagePercentage,
        });
      }
    } catch (error) {
      logger.error('Failed to check storage usage', {error});
    }
  }

  /**
   * 获取存储信息
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      // 模拟获取存储信息
      const totalSpace = 64 * 1024 * 1024 * 1024; // 64GB
      const usedSpace = Math.floor(Math.random() * totalSpace * 0.9);
      const availableSpace = totalSpace - usedSpace;
      const usagePercentage = usedSpace / totalSpace;

      return {
        totalSpace,
        usedSpace,
        availableSpace,
        usagePercentage,
      };
    } catch (error) {
      logger.error('Failed to get storage info', {error});
      throw error;
    }
  }

  /**
   * 获取存储空间分布
   */
  async getStorageBreakdown(): Promise<StorageBreakdown> {
    try {
      logger.info('Calculating storage breakdown');

      // 模拟存储分布
      const total = 10 * 1024 * 1024 * 1024; // 10GB
      const breakdown: StorageBreakdown = {
        database: Math.floor(total * 0.1),
        media: Math.floor(total * 0.7),
        cache: Math.floor(total * 0.15),
        other: Math.floor(total * 0.05),
      };

      logger.info('Storage breakdown calculated', {breakdown});
      return breakdown;
    } catch (error) {
      logger.error('Failed to get storage breakdown', {error});
      throw error;
    }
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<number> {
    try {
      logger.info('Clearing cache');

      // 模拟清理缓存
      const clearedSize = Math.floor(Math.random() * 500 * 1024 * 1024); // 0-500MB

      logger.info('Cache cleared', {size: clearedSize});
      return clearedSize;
    } catch (error) {
      logger.error('Failed to clear cache', {error});
      throw error;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(daysOld: number = 30): Promise<number> {
    try {
      logger.info('Cleaning up expired data', {daysOld});

      // 模拟清理过期数据
      const clearedSize = Math.floor(Math.random() * 1024 * 1024 * 1024); // 0-1GB

      logger.info('Expired data cleaned up', {size: clearedSize, daysOld});
      return clearedSize;
    } catch (error) {
      logger.error('Failed to cleanup expired data', {error});
      throw error;
    }
  }

  /**
   * 添加警告
   */
  private addAlert(alert: Omit<StorageAlert, 'timestamp'>): void {
    const storageAlert: StorageAlert = {
      ...alert,
      timestamp: Date.now(),
    };

    this.alerts.push(storageAlert);

    // 保持最多 100 个警告
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn('Storage alert', {alert: storageAlert});

    // 通知监听器
    this.notifyListeners(storageAlert);
  }

  /**
   * 获取警告列表
   */
  getAlerts(): StorageAlert[] {
    return [...this.alerts];
  }

  /**
   * 清除警告
   */
  clearAlerts(): void {
    this.alerts = [];
    logger.info('Storage alerts cleared');
  }

  /**
   * 订阅存储警告
   */
  subscribe(listener: (alert: StorageAlert) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知监听器
   */
  private notifyListeners(alert: StorageAlert): void {
    this.listeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        logger.error('Error in storage monitor listener', {error});
      }
    });
  }

  /**
   * 设置阈值
   */
  setThresholds(warning: number, critical: number): void {
    this.warningThreshold = warning;
    this.criticalThreshold = critical;
    logger.info('Storage thresholds updated', {warning, critical});
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }
    this.listeners.clear();
    logger.info('Storage monitor service destroyed');
  }
}

// 导出单例
export const storageMonitorService = new StorageMonitorService();


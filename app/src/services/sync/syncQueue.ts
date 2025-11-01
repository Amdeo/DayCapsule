import {logger} from '@services/telemetry/logger';

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'entry' | 'tag' | 'attachment';
  entityId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SyncQueueOptions {
  maxQueueSize?: number;
  autoSync?: boolean;
  syncInterval?: number;
}

/**
 * 同步队列服务
 * 管理离线优先的数据同步队列
 */
export class SyncQueueService {
  private queue: Map<string, SyncQueueItem> = new Map();
  private options: Required<SyncQueueOptions> = {
    maxQueueSize: 1000,
    autoSync: true,
    syncInterval: 30000, // 30 秒
  };

  private syncInProgress: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(item: SyncQueueItem) => void> = new Set();

  constructor(options?: SyncQueueOptions) {
    if (options) {
      this.options = {...this.options, ...options};
    }
    this.initializeAutoSync();
  }

  /**
   * 初始化自动同步
   */
  private initializeAutoSync(): void {
    if (this.options.autoSync) {
      this.syncTimer = setInterval(() => {
        this.processSyncQueue();
      }, this.options.syncInterval);
      logger.info('Auto sync initialized', {interval: this.options.syncInterval});
    }
  }

  /**
   * 添加项目到队列
   */
  addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    try {
      // 检查队列大小
      if (this.queue.size >= this.options.maxQueueSize) {
        throw new Error('Sync queue is full');
      }

      const id = `${item.entityType}_${item.entityId}_${Date.now()}`;
      const queueItem: SyncQueueItem = {
        ...item,
        id,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      };

      this.queue.set(id, queueItem);
      logger.info('Item added to sync queue', {id, type: item.type});

      // 通知监听器
      this.notifyListeners(queueItem);

      return id;
    } catch (error) {
      logger.error('Failed to add item to sync queue', {error});
      throw error;
    }
  }

  /**
   * 从队列中移除项目
   */
  removeFromQueue(id: string): boolean {
    const removed = this.queue.delete(id);
    if (removed) {
      logger.info('Item removed from sync queue', {id});
    }
    return removed;
  }

  /**
   * 获取队列中的项目
   */
  getQueueItem(id: string): SyncQueueItem | undefined {
    return this.queue.get(id);
  }

  /**
   * 获取所有待同步的项目
   */
  getPendingItems(): SyncQueueItem[] {
    return Array.from(this.queue.values()).filter(item => item.status === 'pending');
  }

  /**
   * 获取所有失败的项目
   */
  getFailedItems(): SyncQueueItem[] {
    return Array.from(this.queue.values()).filter(item => item.status === 'failed');
  }

  /**
   * 处理同步队列
   */
  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress) {
      logger.info('Sync already in progress, skipping');
      return;
    }

    try {
      this.syncInProgress = true;
      const pendingItems = this.getPendingItems();

      if (pendingItems.length === 0) {
        logger.info('No pending items to sync');
        return;
      }

      logger.info('Processing sync queue', {itemCount: pendingItems.length});

      for (const item of pendingItems) {
        await this.syncItem(item);
      }

      logger.info('Sync queue processing completed');
    } catch (error) {
      logger.error('Error processing sync queue', {error});
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 同步单个项目
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    try {
      // 更新状态为处理中
      item.status = 'processing';

      // 模拟同步操作
      await this.simulateSync(item);

      // 标记为完成
      item.status = 'completed';
      logger.info('Item synced successfully', {id: item.id});

      // 通知监听器
      this.notifyListeners(item);
    } catch (error) {
      item.lastError = error instanceof Error ? error.message : 'Unknown error';
      item.retryCount++;

      if (item.retryCount >= 5) {
        item.status = 'failed';
        logger.error('Item sync failed after max retries', {
          id: item.id,
          retryCount: item.retryCount,
          error: item.lastError,
        });
      } else {
        item.status = 'pending';
        logger.warn('Item sync failed, will retry', {
          id: item.id,
          retryCount: item.retryCount,
          error: item.lastError,
        });
      }

      // 通知监听器
      this.notifyListeners(item);
    }
  }

  /**
   * 模拟同步操作
   */
  private async simulateSync(item: SyncQueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟 5% 的失败率
        if (Math.random() > 0.95) {
          reject(new Error('Sync failed'));
        } else {
          resolve();
        }
      }, 500);
    });
  }

  /**
   * 获取队列大小
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * 获取队列统计
   */
  getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const stats = {
      total: this.queue.size,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    this.queue.forEach(item => {
      stats[item.status]++;
    });

    return stats;
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue.clear();
    logger.info('Sync queue cleared');
  }

  /**
   * 订阅队列变化
   */
  subscribe(listener: (item: SyncQueueItem) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知监听器
   */
  private notifyListeners(item: SyncQueueItem): void {
    this.listeners.forEach(listener => {
      try {
        listener(item);
      } catch (error) {
        logger.error('Error in sync queue listener', {error});
      }
    });
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.listeners.clear();
    logger.info('Sync queue service destroyed');
  }
}

// 导出单例
export const syncQueueService = new SyncQueueService();


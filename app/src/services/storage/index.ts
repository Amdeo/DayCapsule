import {databaseService} from './database';
import {encryptionService} from './encryption';

/**
 * 存储服务初始化
 * 按顺序初始化加密服务和数据库服务
 */
export async function initializeStorage(): Promise<void> {
  try {
    // 1. 初始化加密服务
    await encryptionService.init();

    // 2. 初始化数据库
    await databaseService.init();

    console.log('Storage services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize storage services:', error);
    throw error;
  }
}

export {databaseService, encryptionService};
export * from './database';
export * from './encryption';

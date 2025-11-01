/**
 * 应用初始化模块
 *
 * 在应用启动时初始化所有必要的服务
 */

import {databaseService} from '@services/storage/database';
import {fileSystemService} from '@services/storage/fileSystem';
import {speechToTextService} from '@services/speechToText';
import {tencentCloudConfig, isConfigValid} from '@config/tencentCloud';
import {logger} from '@services/telemetry/logger';

/**
 * 初始化所有服务
 */
export const initializeApp = async (): Promise<void> => {
  try {
    logger.info('Starting app initialization...');

    // 1. 初始化数据库
    logger.info('Initializing database...');
    await databaseService.init();

    // 2. 初始化文件系统
    logger.info('Initializing file system...');
    await fileSystemService.init();

    // 3. 初始化语音转文字服务
    if (isConfigValid()) {
      logger.info('Initializing speech-to-text service...');
      await speechToTextService.init(tencentCloudConfig);
    } else {
      logger.warn(
        'Tencent Cloud config is incomplete, speech-to-text service will not be available',
      );
    }

    logger.info('App initialization completed successfully');
  } catch (error) {
    logger.error('App initialization failed', {error});
    throw error;
  }
};

/**
 * 清理应用资源
 */
export const cleanupApp = async (): Promise<void> => {
  try {
    logger.info('Starting app cleanup...');

    // 清理语音转文字服务
    speechToTextService.dispose();

    logger.info('App cleanup completed');
  } catch (error) {
    logger.error('App cleanup failed', {error});
  }
};

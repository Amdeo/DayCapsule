/**
 * 数据库查询安全包装器
 * 统一处理 try/catch + 错误日志 + fallback 返回
 */

import { getDatabase } from '../sqlite';
import { logger } from '@/src/utils/logger';

type Database = ReturnType<typeof getDatabase>;

export async function safeQuery<T>(
  label: string,
  fn: (db: Database) => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    const db = getDatabase();
    return await fn(db);
  } catch (error) {
    logger.error(`Failed to ${label}:`, error);
    return fallback;
  }
}

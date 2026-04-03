/**
 * 孤儿 Workspace 清理服务
 * 在 bootstrap 完成后自动清理非当前账号的 environments 目录
 */

import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/src/utils/logger';

const ENVIRONMENTS_SUBDIR = 'environments/';

async function cleanupDir(baseDir: string | null | undefined, currentScope: string): Promise<void> {
  if (!baseDir) return;
  const envDir = `${baseDir}${ENVIRONMENTS_SUBDIR}`;

  let names: string[];
  try {
    names = await FileSystem.readDirectoryAsync(envDir);
  } catch {
    // 目录不存在时直接返回，属于正常情况
    return;
  }

  for (const name of names) {
    if (name === currentScope) continue;
    const entryUri = `${envDir}${name}/`;
    try {
      await FileSystem.deleteAsync(entryUri, { idempotent: true });
      logger.log(`已清理孤儿 workspace：${name}`);
    } catch (e: unknown) {
      logger.warn(`清理 workspace 失败：${name}`, e);
    }
  }
}

export async function cleanupOrphanWorkspaces(currentScope: string): Promise<void> {
  await Promise.all([
    cleanupDir(FileSystem.documentDirectory, currentScope),
    cleanupDir(FileSystem.cacheDirectory, currentScope),
  ]);
}

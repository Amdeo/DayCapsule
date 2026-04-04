import { cleanupOrphanWorkspaces } from '@/src/services/workspaceCleanupService';
import { getCurrentDataScopeKeySync } from '@/src/services/workspaceService';
import { LOCAL_SCOPE_KEY } from '@/src/services/workspaceSessionState';
import { resetApiClient } from '@/src/services/apiClient';
import { initDatabase, resetDatabase } from '@/src/database/sqlite';
import { useAuthStore } from '@/src/store/authStore';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
import { useEntryStore } from '@/src/store/entryStore';
import { ensureDirectories, deleteDirectory, MEDIA_DIRS } from '@/src/utils/fileSystem';
import { Storage } from '@/src/utils/storage';

const RECENT_SERVER_URLS_KEY = 'backend:recentServerUrls';
const ENVIRONMENTS_SUBDIR = 'environments/';

const getWorkspaceDir = (baseDir: string, scopeKey: string): string =>
  `${baseDir}${ENVIRONMENTS_SUBDIR}${scopeKey}/`;

async function clearWorkspaceDirectories(scopeKeys: Iterable<string>): Promise<void> {
  const uniqueScopes = Array.from(new Set(scopeKeys)).filter(Boolean);

  await Promise.all(
    uniqueScopes.flatMap((scopeKey) => [
      deleteDirectory(getWorkspaceDir(MEDIA_DIRS.documents, scopeKey)),
      deleteDirectory(getWorkspaceDir(MEDIA_DIRS.cache, scopeKey)),
    ])
  );
}

async function clearPersistedStateExceptRecentServerUrls(): Promise<void> {
  const keys = await Storage.getAllKeys();
  const keysToDelete = keys.filter((key) => key !== RECENT_SERVER_URLS_KEY);
  await Promise.all(keysToDelete.map((key) => Storage.delete(key)));
}

export async function resetAppToInitialState(): Promise<void> {
  const currentScopeKey = getCurrentDataScopeKeySync();
  const scopesToClear = new Set<string>([LOCAL_SCOPE_KEY, currentScopeKey]);

  resetApiClient();
  resetDatabase();

  await clearWorkspaceDirectories(scopesToClear);
  await clearPersistedStateExceptRecentServerUrls();
  await cleanupOrphanWorkspaces([LOCAL_SCOPE_KEY]);

  const databaseReady = await initDatabase();
  if (!databaseReady) {
    throw new Error('初始化数据库失败');
  }

  await ensureDirectories();
  useEntryStore.getState().invalidateActiveQueries();
  await useAuthStore.getState().loadAuth();
  await useCommonTagsStore.getState().loadCommonTags();
}

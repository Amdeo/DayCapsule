import {
  getCurrentServerUrl,
  normalizeServerUrl,
  rememberServerUrl,
  setCurrentServerUrl,
} from '@/src/services/backendEnvironmentService';
import { resetApiClient } from '@/src/services/apiClient';
import { initDatabase, resetDatabase } from '@/src/database/sqlite';
import { ensureDirectories } from '@/src/utils/fileSystem';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useSyncStore } from '@/src/store/syncStore';
import { useAuthStore } from '@/src/store/authStore';
import { useEntryStore } from '@/src/store/entryStore';

export interface BackendEnvironmentSwitchResult {
  switched: boolean;
  currentServerUrl: string;
}

const reloadEnvironmentState = async (): Promise<void> => {
  await Promise.all([
    useSettingsStore.getState().loadSettings(),
    useSyncStore.getState().load(),
    useAuthStore.getState().loadAuth(),
    useEntryStore.getState().loadEntries(),
  ]);
};

const initializeEnvironmentRuntime = async (): Promise<void> => {
  resetApiClient();
  resetDatabase();
  const databaseReady = await initDatabase();
  if (!databaseReady) {
    throw new Error('初始化数据库失败');
  }
  await ensureDirectories();
};

export const switchBackendEnvironment = async (
  nextServerUrl: string,
): Promise<BackendEnvironmentSwitchResult> => {
  const normalizedNextServerUrl = normalizeServerUrl(nextServerUrl);
  const currentServerUrl = await getCurrentServerUrl();

  if (normalizedNextServerUrl === currentServerUrl) {
    await rememberServerUrl(normalizedNextServerUrl);
    return {
      switched: false,
      currentServerUrl: normalizedNextServerUrl,
    };
  }

  await setCurrentServerUrl(normalizedNextServerUrl);

  try {
    await initializeEnvironmentRuntime();
    await reloadEnvironmentState();
    await rememberServerUrl(normalizedNextServerUrl);

    return {
      switched: true,
      currentServerUrl: normalizedNextServerUrl,
    };
  } catch (error) {
    await setCurrentServerUrl(currentServerUrl);
    await initializeEnvironmentRuntime();
    await reloadEnvironmentState();
    throw error;
  }
};

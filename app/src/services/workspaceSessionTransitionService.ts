import { Storage, withScope } from '@/src/utils/storage';
import {
  clearCurrentServerUrl,
  getCurrentServerUrl,
  getServerKey,
  setCurrentServerUrl,
} from '@/src/services/backendEnvironmentService';
import {
  clearActiveAccount,
  setActiveAccount,
  type ActiveAccountRef,
} from '@/src/services/accountRegistryService';
import { buildDataScopeKey } from '@/src/services/workspaceService';
import { prepareScopeRuntime } from '@/src/services/scopeRuntimeService';
import {
  LOCAL_SCOPE_KEY,
  useWorkspaceSessionStore,
} from '@/src/services/workspaceSessionState';
import { useCloudSyncIndicatorStore } from '@/src/store/cloudSyncIndicatorStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useSyncStore } from '@/src/store/syncStore';
import { logger } from '@/src/utils/logger';

const ACTIVE_ACCOUNT_KEY = 'accounts:active';

const getWorkspaceUserIdKey = (serverUrl: string): string =>
  withScope(getServerKey(serverUrl), 'workspace:currentUserId');

const getCurrentServerUrlSafe = async (): Promise<string | null> => {
  try {
    return await getCurrentServerUrl();
  } catch {
    return null;
  }
};

async function writeAccountScopePointer(serverUrl: string, userId: string): Promise<void> {
  await setCurrentServerUrl(serverUrl);
  await Promise.all([
    setActiveAccount(serverUrl, userId),
    Storage.setString(getWorkspaceUserIdKey(serverUrl), userId),
  ]);
  useWorkspaceSessionStore.getState().setCurrentScopeKey(buildDataScopeKey(serverUrl, userId));
}

async function clearAccountScopePointer(serverUrl: string | null): Promise<void> {
  await clearActiveAccount();
  if (serverUrl) {
    await Storage.delete(getWorkspaceUserIdKey(serverUrl));
  }
  useWorkspaceSessionStore.getState().setCurrentScopeKey(LOCAL_SCOPE_KEY);
}

async function refreshScopedStores(): Promise<void> {
  await useSyncStore.getState().reset();
  await useSyncStore.getState().load();
  await useSettingsStore.getState().loadSettings();
  await useEntryStore.getState().loadEntries();
  await useCloudSyncIndicatorStore.getState().refresh();
}

async function runTransition<T>(action: () => Promise<T>): Promise<T> {
  useWorkspaceSessionStore.getState().setSessionTransitioning(true);
  try {
    return await action();
  } finally {
    useWorkspaceSessionStore.getState().setSessionTransitioning(false);
  }
}

export interface EnterAccountScopeAfterLoginOptions {
  serverUrl: string;
  userId: string;
  onFailureResetAuthState?: () => void;
}

export interface RestoreAccountScopeOptions {
  serverUrl: string;
  userId: string;
  onFailureResetAuthState?: () => void;
}

export interface SwitchActiveAccountScopeOptions {
  serverUrl: string;
  userId: string;
  onFailureRestoreAuthState?: () => void;
}

export async function enterAccountScopeAfterLogin({
  serverUrl,
  userId,
  onFailureResetAuthState,
}: EnterAccountScopeAfterLoginOptions): Promise<string> {
  return runTransition(async () => {
    const prepareResult = await prepareScopeRuntime({ serverUrl, userId });
    if (!prepareResult.prepared) {
      await clearAccountScopePointer(serverUrl);
      onFailureResetAuthState?.();
      throw new Error(prepareResult.failureReason ?? '账号数据作用域初始化失败');
    }

    try {
      await writeAccountScopePointer(serverUrl, userId);
      await refreshScopedStores();
      return prepareResult.targetScopeKey;
    } catch (error) {
      await clearAccountScopePointer(serverUrl);
      onFailureResetAuthState?.();
      logger.error('[workspaceSessionTransitionService] enterAccountScopeAfterLogin failed:', error);
      throw error;
    }
  });
}

export async function restoreAccountScopeFromPersistedAuth({
  serverUrl,
  userId,
  onFailureResetAuthState,
}: RestoreAccountScopeOptions): Promise<string> {
  return runTransition(async () => {
    const prepareResult = await prepareScopeRuntime({ serverUrl, userId });
    if (!prepareResult.prepared) {
      await clearAccountScopePointer(serverUrl);
      onFailureResetAuthState?.();
      throw new Error(prepareResult.failureReason ?? '恢复账号数据作用域失败');
    }

    try {
      await writeAccountScopePointer(serverUrl, userId);
      await refreshScopedStores();
      return prepareResult.targetScopeKey;
    } catch (error) {
      await clearAccountScopePointer(serverUrl);
      onFailureResetAuthState?.();
      logger.error('[workspaceSessionTransitionService] restoreAccountScopeFromPersistedAuth failed:', error);
      throw error;
    }
  });
}

export async function switchActiveAccountScope({
  serverUrl,
  userId,
  onFailureRestoreAuthState,
}: SwitchActiveAccountScopeOptions): Promise<string> {
  return runTransition(async () => {
    const previousServerUrl = await getCurrentServerUrlSafe();
    const previousActiveAccount = await Storage.getObject<ActiveAccountRef>(ACTIVE_ACCOUNT_KEY);
    const previousWorkspaceUserId = previousServerUrl
      ? await Storage.getString(getWorkspaceUserIdKey(previousServerUrl))
      : null;

    const prepareResult = await prepareScopeRuntime({ serverUrl, userId });
    if (!prepareResult.prepared) {
      onFailureRestoreAuthState?.();
      throw new Error(prepareResult.failureReason ?? '切换账号数据作用域失败');
    }

    try {
      await writeAccountScopePointer(serverUrl, userId);
      await refreshScopedStores();
      return prepareResult.targetScopeKey;
    } catch (error) {
      if (previousServerUrl) {
        await setCurrentServerUrl(previousServerUrl);
      } else {
        await clearCurrentServerUrl();
      }

      if (previousActiveAccount && previousServerUrl) {
        await Promise.all([
          setActiveAccount(previousActiveAccount.serverUrl, previousActiveAccount.userId),
          previousWorkspaceUserId
            ? Storage.setString(getWorkspaceUserIdKey(previousServerUrl), previousWorkspaceUserId)
            : Storage.delete(getWorkspaceUserIdKey(previousServerUrl)),
        ]);
        useWorkspaceSessionStore.getState().setCurrentScopeKey(
          previousWorkspaceUserId
            ? buildDataScopeKey(previousActiveAccount.serverUrl, previousActiveAccount.userId)
            : LOCAL_SCOPE_KEY
        );
      } else {
        await clearAccountScopePointer(serverUrl);
      }

      await refreshScopedStores();
      onFailureRestoreAuthState?.();
      logger.error('[workspaceSessionTransitionService] switchActiveAccountScope failed:', error);
      throw error;
    }
  });
}

export async function returnToLocalScopeAfterLogout(): Promise<void> {
  await runTransition(async () => {
    const currentServerUrl = await getCurrentServerUrlSafe();
    await clearAccountScopePointer(currentServerUrl);
    await refreshScopedStores();
  });
}

import { Storage, withScope } from '@/src/utils/storage';
import { getServerKey } from '@/src/services/backendEnvironmentService';
import {
  clearActiveAccount,
  getActiveAccountRef,
  getUserAuthKeys,
  registerAccount,
  setActiveAccount,
  unregisterAccount,
} from '@/src/services/accountRegistryService';
import { prepareScopeRuntime } from '@/src/services/scopeRuntimeService';
import { useEntryStore } from '@/src/store/entryStore';
import { logger } from '@/src/utils/logger';

const ACTIVE_ACCOUNT_KEY = 'accounts:active';

export interface ActivatableAuthUser {
  id: string;
  email: string;
}

export interface ActivatableAuthState {
  user: ActivatableAuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface ActivateAuthenticatedAccountParams {
  serverUrl: string;
  user: ActivatableAuthUser;
  token: string;
  refreshToken: string;
  previousAuthState: ActivatableAuthState;
  commitAuthState: (nextState: ActivatableAuthState) => void;
  restoreAuthState: (previousState: ActivatableAuthState) => void;
}

async function restoreWorkspaceUserId(key: string, previousValue: string | null): Promise<void> {
  if (previousValue) {
    await Storage.setString(key, previousValue);
    return;
  }
  await Storage.delete(key);
}

async function safeCompensate(label: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    logger.error(`[authActivationService] Compensation failed: ${label}`, error);
  }
}

export async function activateAuthenticatedAccount({
  serverUrl,
  user,
  token,
  refreshToken,
  previousAuthState,
  commitAuthState,
  restoreAuthState,
}: ActivateAuthenticatedAccountParams): Promise<string> {
  const prepareResult = await prepareScopeRuntime({ serverUrl, userId: user.id });
  if (!prepareResult.prepared) {
    throw new Error(prepareResult.failureReason ?? '账号数据作用域初始化失败');
  }

  useEntryStore.getState().invalidateActiveQueries();

  const previousActiveAccount = await getActiveAccountRef();
  const workspaceUserIdKey = withScope(getServerKey(serverUrl), 'workspace:currentUserId');
  const previousWorkspaceUserId = await Storage.getString(workspaceUserIdKey);
  const { tokenKey, refreshTokenKey, userKey } = getUserAuthKeys(serverUrl, user.id);

  let authCommitted = false;
  let tokensPersisted = false;
  let accountRegistered = false;
  let activeAccountCommitted = false;
  let workspaceCommitted = false;

  try {
    commitAuthState({
      user,
      token,
      refreshToken,
      isAuthenticated: true,
    });
    authCommitted = true;

    await Promise.all([
      Storage.setString(tokenKey, token),
      Storage.setString(refreshTokenKey, refreshToken),
      Storage.setObject(userKey, user),
    ]);
    tokensPersisted = true;

    await registerAccount({ serverUrl, userId: user.id, email: user.email, addedAt: Date.now() });
    accountRegistered = true;

    await setActiveAccount(serverUrl, user.id);
    activeAccountCommitted = true;

    await Storage.setString(workspaceUserIdKey, user.id);
    workspaceCommitted = true;

    return prepareResult.targetScopeKey;
  } catch (error) {
    await safeCompensate('workspaceUserId', async () => {
      if (workspaceCommitted) {
        await restoreWorkspaceUserId(workspaceUserIdKey, previousWorkspaceUserId);
      }
    });

    await safeCompensate('activeAccount', async () => {
      if (!activeAccountCommitted) {
        return;
      }
      if (previousActiveAccount) {
        await setActiveAccount(previousActiveAccount.serverUrl, previousActiveAccount.userId);
        return;
      }
      await clearActiveAccount();
      await Storage.delete(ACTIVE_ACCOUNT_KEY);
    });

    await safeCompensate('accountRegistry', async () => {
      if (accountRegistered) {
        await unregisterAccount(serverUrl, user.id);
      }
    });

    await safeCompensate('authTokens', async () => {
      if (tokensPersisted) {
        await Promise.all([
          Storage.delete(tokenKey),
          Storage.delete(refreshTokenKey),
          Storage.delete(userKey),
        ]);
      }
    });

    if (authCommitted) {
      restoreAuthState(previousAuthState);
    }

    logger.error('[authActivationService] Activation failed:', error);
    throw error;
  }
}

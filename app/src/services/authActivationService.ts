import { Storage } from '@/src/utils/storage';
import {
  getUserAuthKeys,
  registerAccount,
  unregisterAccount,
} from '@/src/services/accountRegistryService';
import { enterAccountScopeAfterLogin } from '@/src/services/workspaceSessionTransitionService';
import { logger } from '@/src/utils/logger';

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
  const { tokenKey, refreshTokenKey, userKey } = getUserAuthKeys(serverUrl, user.id);

  let authCommitted = false;
  let tokensPersisted = false;
  let accountRegistered = false;
  let enteredAccountScope = false;

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

    const targetScopeKey = await enterAccountScopeAfterLogin({
      serverUrl,
      userId: user.id,
      onFailureResetAuthState: () => {
        restoreAuthState({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    });
    enteredAccountScope = true;

    return targetScopeKey;
  } catch (error) {
    if (enteredAccountScope) {
      logger.error('[authActivationService] Activation failed after scope transition:', error);
      throw error;
    }

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

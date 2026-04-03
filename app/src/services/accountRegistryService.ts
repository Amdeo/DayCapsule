import { Storage } from '@/src/utils/storage';
import { buildDataScopeKey } from '@/src/services/workspaceService';
import {
  getServerKey,
  getCurrentServerUrl,
  getRecentServerUrls,
} from '@/src/services/backendEnvironmentService';
import { logger } from '@/src/utils/logger';

// ──────────────────────────────────────────────────
// 类型
// ──────────────────────────────────────────────────
export interface AccountEntry {
  serverUrl: string;
  userId: string;
  email: string;
  addedAt: number;
}

interface ActiveAccountRef {
  serverUrl: string;
  userId: string;
}

interface OldAuthUser {
  id: string;
  email: string;
}

// ──────────────────────────────────────────────────
// 常量
// ──────────────────────────────────────────────────
const REGISTRY_KEY = 'accounts:registry';
const ACTIVE_KEY = 'accounts:active';
const MIGRATION_V2_KEY = 'migration:authKeysV2';

// ──────────────────────────────────────────────────
// Token key 生成
// ──────────────────────────────────────────────────
export function getUserAuthKeys(
  serverUrl: string,
  userId: string,
): { tokenKey: string; refreshTokenKey: string; userKey: string } {
  const scope = buildDataScopeKey(serverUrl, userId);
  return {
    tokenKey: `${scope}:auth:token`,
    refreshTokenKey: `${scope}:auth:refreshToken`,
    userKey: `${scope}:auth:user`,
  };
}

// ──────────────────────────────────────────────────
// 读取
// ──────────────────────────────────────────────────
export async function getRegisteredAccounts(): Promise<AccountEntry[]> {
  const accounts = await Storage.getObject<AccountEntry[]>(REGISTRY_KEY);
  return accounts ?? [];
}

export async function getActiveAccountRef(): Promise<ActiveAccountRef | null> {
  return Storage.getObject<ActiveAccountRef>(ACTIVE_KEY);
}

export function getActiveAccountRefSync(): ActiveAccountRef | null {
  return Storage.getObjectSync<ActiveAccountRef>(ACTIVE_KEY);
}

// ──────────────────────────────────────────────────
// 写入
// ──────────────────────────────────────────────────
export async function registerAccount(entry: AccountEntry): Promise<void> {
  const accounts = await getRegisteredAccounts();
  const filtered = accounts.filter(
    a => !(a.serverUrl === entry.serverUrl && a.userId === entry.userId),
  );
  await Storage.setObject<AccountEntry[]>(REGISTRY_KEY, [...filtered, entry]);
}

export async function setActiveAccount(serverUrl: string, userId: string): Promise<void> {
  await Storage.setObject<ActiveAccountRef>(ACTIVE_KEY, { serverUrl, userId });
}

export async function removeAccount(serverUrl: string, userId: string): Promise<void> {
  const accounts = await getRegisteredAccounts();
  const filtered = accounts.filter(
    a => !(a.serverUrl === serverUrl && a.userId === userId),
  );
  await Storage.setObject<AccountEntry[]>(REGISTRY_KEY, filtered);

  const { tokenKey, refreshTokenKey, userKey } = getUserAuthKeys(serverUrl, userId);
  await Storage.delete(tokenKey);
  await Storage.delete(refreshTokenKey);
  await Storage.delete(userKey);
}

// ──────────────────────────────────────────────────
// Token 读取
// ──────────────────────────────────────────────────
export async function getAccountTokens(
  serverUrl: string,
  userId: string,
): Promise<{ token: string | null; refreshToken: string | null }> {
  const { tokenKey, refreshTokenKey } = getUserAuthKeys(serverUrl, userId);
  const [token, refreshToken] = await Promise.all([
    Storage.getString(tokenKey),
    Storage.getString(refreshTokenKey),
  ]);
  return { token, refreshToken };
}

// ──────────────────────────────────────────────────
// 迁移：旧 server-scoped → 新 user-scoped
// ──────────────────────────────────────────────────
async function migrateOneServer(serverUrl: string, currentServerUrl: string | null): Promise<void> {
  const serverScope = getServerKey(serverUrl);
  const oldTokenKey = `${serverScope}:auth:token`;
  const oldRefreshKey = `${serverScope}:auth:refreshToken`;
  const oldUserKey = `${serverScope}:auth:user`;

  const [token, userJson] = await Promise.all([
    Storage.getString(oldTokenKey),
    Storage.getString(oldUserKey),
  ]);

  if (!token || !userJson) return;

  let user: OldAuthUser;
  try {
    user = JSON.parse(userJson) as OldAuthUser;
  } catch {
    logger.warn('[accountRegistryService] 迁移：解析旧 user JSON 失败', serverUrl);
    return;
  }

  const { tokenKey, refreshTokenKey, userKey } = getUserAuthKeys(serverUrl, user.id);
  const refreshToken = await Storage.getString(oldRefreshKey);

  await Storage.setString(tokenKey, token);
  if (refreshToken) await Storage.setString(refreshTokenKey, refreshToken);
  await Storage.setString(userKey, userJson);

  await registerAccount({
    serverUrl,
    userId: user.id,
    email: user.email,
    addedAt: Date.now(),
  });

  if (serverUrl === currentServerUrl) {
    await setActiveAccount(serverUrl, user.id);
  }

  await Storage.delete(oldTokenKey);
  await Storage.delete(oldRefreshKey);
  await Storage.delete(oldUserKey);
}

export async function migrateAuthKeysToUserScoped(): Promise<void> {
  try {
    const done = await Storage.getString(MIGRATION_V2_KEY);
    if (done === 'done') return;

    const [recentUrls, currentServerUrl] = await Promise.all([
      getRecentServerUrls(),
      getCurrentServerUrl(),
    ]);

    const allUrls = Array.from(new Set([...recentUrls, ...(currentServerUrl ? [currentServerUrl] : [])]));

    for (const serverUrl of allUrls) {
      await migrateOneServer(serverUrl, currentServerUrl);
    }

    await Storage.setString(MIGRATION_V2_KEY, 'done');
    logger.log('[accountRegistryService] 迁移完成');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn('[accountRegistryService] 迁移异常，跳过：', msg);
  }
}

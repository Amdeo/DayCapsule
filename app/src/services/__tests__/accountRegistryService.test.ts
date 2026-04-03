// Mock MMKV storage
const mockStorage: Record<string, unknown> = {};

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn((key: string) => Promise.resolve(mockStorage[key] as string ?? null)),
    getStringSync: jest.fn((key: string) => mockStorage[key] as string ?? null),
    setString: jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    getObject: jest.fn(<T>(key: string) => Promise.resolve(mockStorage[key] as T ?? null)),
    getObjectSync: jest.fn(<T>(key: string) => mockStorage[key] as T ?? null),
    setObject: jest.fn(<T>(key: string, value: T) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    delete: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  },
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: jest.fn().mockResolvedValue('https://server-a.example.com'),
  getCurrentServerUrlSync: jest.fn(() => 'https://server-a.example.com'),
  getServerKey: jest.fn((url: string) => `env_${url.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`),
  getRecentServerUrls: jest.fn().mockResolvedValue(['https://server-a.example.com']),
}));

jest.mock('@/src/services/workspaceService', () => ({
  buildDataScopeKey: jest.fn((serverUrl: string, userId: string) => {
    const scope = `env_${serverUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    return `${scope}_${userId}`;
  }),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  getRegisteredAccounts,
  getActiveAccountRef,
  getActiveAccountRefSync,
  registerAccount,
  setActiveAccount,
  removeAccount,
  getUserAuthKeys,
  getAccountTokens,
  migrateAuthKeysToUserScoped,
  type AccountEntry,
} from '../accountRegistryService';
import { Storage } from '@/src/utils/storage';
import {
  getCurrentServerUrlSync,
  getServerKey,
  getRecentServerUrls,
} from '@/src/services/backendEnvironmentService';

const SERVER_A = 'https://server-a.example.com';
const SERVER_B = 'https://server-b.example.com';
const USER_ID = 'user123';
const USER_EMAIL = 'user@example.com';

const makeEntry = (overrides?: Partial<AccountEntry>): AccountEntry => ({
  serverUrl: SERVER_A,
  userId: USER_ID,
  email: USER_EMAIL,
  addedAt: 1000,
  ...overrides,
});

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────
// getUserAuthKeys
// ──────────────────────────────────────────────────
describe('getUserAuthKeys', () => {
  it('returns correct scoped keys', () => {
    const keys = getUserAuthKeys(SERVER_A, USER_ID);
    const scope = `env_${SERVER_A.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${USER_ID}`;
    expect(keys.tokenKey).toBe(`${scope}:auth:token`);
    expect(keys.refreshTokenKey).toBe(`${scope}:auth:refreshToken`);
    expect(keys.userKey).toBe(`${scope}:auth:user`);
  });
});

// ──────────────────────────────────────────────────
// getRegisteredAccounts
// ──────────────────────────────────────────────────
describe('getRegisteredAccounts', () => {
  it('returns empty array when no registry', async () => {
    const accounts = await getRegisteredAccounts();
    expect(accounts).toEqual([]);
  });

  it('returns stored accounts', async () => {
    const entry = makeEntry();
    mockStorage['accounts:registry'] = [entry];
    const accounts = await getRegisteredAccounts();
    expect(accounts).toEqual([entry]);
  });
});

// ──────────────────────────────────────────────────
// getActiveAccountRef
// ──────────────────────────────────────────────────
describe('getActiveAccountRef', () => {
  it('returns null when no active account', async () => {
    const ref = await getActiveAccountRef();
    expect(ref).toBeNull();
  });

  it('returns stored active account ref', async () => {
    mockStorage['accounts:active'] = { serverUrl: SERVER_A, userId: USER_ID };
    const ref = await getActiveAccountRef();
    expect(ref).toEqual({ serverUrl: SERVER_A, userId: USER_ID });
  });
});

// ──────────────────────────────────────────────────
// getActiveAccountRefSync
// ──────────────────────────────────────────────────
describe('getActiveAccountRefSync', () => {
  it('returns null when no active account', () => {
    expect(getActiveAccountRefSync()).toBeNull();
  });

  it('returns stored active account ref synchronously', () => {
    mockStorage['accounts:active'] = { serverUrl: SERVER_A, userId: USER_ID };
    expect(getActiveAccountRefSync()).toEqual({ serverUrl: SERVER_A, userId: USER_ID });
  });
});

// ──────────────────────────────────────────────────
// registerAccount
// ──────────────────────────────────────────────────
describe('registerAccount', () => {
  it('adds account to empty registry', async () => {
    const entry = makeEntry();
    await registerAccount(entry);
    const accounts = await getRegisteredAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual(entry);
  });

  it('deduplicates by serverUrl+userId', async () => {
    const entry = makeEntry();
    await registerAccount(entry);
    await registerAccount({ ...entry, email: 'new@example.com', addedAt: 2000 });
    const accounts = await getRegisteredAccounts();
    expect(accounts).toHaveLength(1);
    // 后来的覆盖旧的
    expect(accounts[0].email).toBe('new@example.com');
  });

  it('can register multiple different accounts', async () => {
    await registerAccount(makeEntry({ serverUrl: SERVER_A, userId: 'u1' }));
    await registerAccount(makeEntry({ serverUrl: SERVER_A, userId: 'u2' }));
    await registerAccount(makeEntry({ serverUrl: SERVER_B, userId: 'u1' }));
    const accounts = await getRegisteredAccounts();
    expect(accounts).toHaveLength(3);
  });
});

// ──────────────────────────────────────────────────
// setActiveAccount
// ──────────────────────────────────────────────────
describe('setActiveAccount', () => {
  it('stores active account ref', async () => {
    await setActiveAccount(SERVER_A, USER_ID);
    const ref = await getActiveAccountRef();
    expect(ref).toEqual({ serverUrl: SERVER_A, userId: USER_ID });
  });
});

// ──────────────────────────────────────────────────
// removeAccount
// ──────────────────────────────────────────────────
describe('removeAccount', () => {
  it('removes account from registry', async () => {
    await registerAccount(makeEntry());
    await removeAccount(SERVER_A, USER_ID);
    const accounts = await getRegisteredAccounts();
    expect(accounts).toHaveLength(0);
  });

  it('deletes user auth keys on removal', async () => {
    await registerAccount(makeEntry());
    const { tokenKey, refreshTokenKey, userKey } = getUserAuthKeys(SERVER_A, USER_ID);
    mockStorage[tokenKey] = 'tok';
    mockStorage[refreshTokenKey] = 'rtok';
    mockStorage[userKey] = '{"id":"u1"}';

    await removeAccount(SERVER_A, USER_ID);

    expect(Storage.delete).toHaveBeenCalledWith(tokenKey);
    expect(Storage.delete).toHaveBeenCalledWith(refreshTokenKey);
    expect(Storage.delete).toHaveBeenCalledWith(userKey);
  });

  it('leaves other accounts intact', async () => {
    await registerAccount(makeEntry({ userId: 'u1' }));
    await registerAccount(makeEntry({ userId: 'u2' }));
    await removeAccount(SERVER_A, 'u1');
    const accounts = await getRegisteredAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].userId).toBe('u2');
  });
});

// ──────────────────────────────────────────────────
// getAccountTokens
// ──────────────────────────────────────────────────
describe('getAccountTokens', () => {
  it('returns null when no tokens stored', async () => {
    const result = await getAccountTokens(SERVER_A, USER_ID);
    expect(result).toEqual({ token: null, refreshToken: null });
  });

  it('returns stored tokens', async () => {
    const { tokenKey, refreshTokenKey } = getUserAuthKeys(SERVER_A, USER_ID);
    mockStorage[tokenKey] = 'my-token';
    mockStorage[refreshTokenKey] = 'my-refresh';
    const result = await getAccountTokens(SERVER_A, USER_ID);
    expect(result).toEqual({ token: 'my-token', refreshToken: 'my-refresh' });
  });
});

// ──────────────────────────────────────────────────
// migrateAuthKeysToUserScoped
// ──────────────────────────────────────────────────
describe('migrateAuthKeysToUserScoped', () => {
  beforeEach(() => {
    (getServerKey as jest.Mock).mockImplementation(
      (url: string) => `env_${url.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
    );
    (getRecentServerUrls as jest.Mock).mockResolvedValue([SERVER_A]);
    (getCurrentServerUrlSync as jest.Mock).mockReturnValue(SERVER_A);
  });

  it('skips migration if already done', async () => {
    mockStorage['migration:authKeysV2'] = 'done';
    await migrateAuthKeysToUserScoped();
    expect(Storage.setObject).not.toHaveBeenCalled();
  });

  it('migrates token from server-scoped to user-scoped key', async () => {
    const serverScope = `env_${SERVER_A.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    mockStorage[`${serverScope}:auth:token`] = 'old-token';
    mockStorage[`${serverScope}:auth:refreshToken`] = 'old-refresh';
    mockStorage[`${serverScope}:auth:user`] = JSON.stringify({ id: USER_ID, email: USER_EMAIL });

    await migrateAuthKeysToUserScoped();

    const { tokenKey, refreshTokenKey } = getUserAuthKeys(SERVER_A, USER_ID);
    expect(mockStorage[tokenKey]).toBe('old-token');
    expect(mockStorage[refreshTokenKey]).toBe('old-refresh');
    expect(mockStorage['migration:authKeysV2']).toBe('done');
  });

  it('registers account during migration', async () => {
    const serverScope = `env_${SERVER_A.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    mockStorage[`${serverScope}:auth:token`] = 'tok';
    mockStorage[`${serverScope}:auth:user`] = JSON.stringify({ id: USER_ID, email: USER_EMAIL });

    await migrateAuthKeysToUserScoped();

    const accounts = await getRegisteredAccounts();
    expect(accounts.some(a => a.userId === USER_ID && a.serverUrl === SERVER_A)).toBe(true);
  });

  it('sets active account for currentServerUrl during migration', async () => {
    const serverScope = `env_${SERVER_A.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    mockStorage[`${serverScope}:auth:token`] = 'tok';
    mockStorage[`${serverScope}:auth:user`] = JSON.stringify({ id: USER_ID, email: USER_EMAIL });

    await migrateAuthKeysToUserScoped();

    const ref = await getActiveAccountRef();
    expect(ref).toEqual({ serverUrl: SERVER_A, userId: USER_ID });
  });

  it('removes old server-scoped auth keys after migration', async () => {
    const serverScope = `env_${SERVER_A.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    const oldTokenKey = `${serverScope}:auth:token`;
    const oldRefreshKey = `${serverScope}:auth:refreshToken`;
    const oldUserKey = `${serverScope}:auth:user`;
    mockStorage[oldTokenKey] = 'tok';
    mockStorage[oldRefreshKey] = 'rtok';
    mockStorage[oldUserKey] = JSON.stringify({ id: USER_ID, email: USER_EMAIL });

    await migrateAuthKeysToUserScoped();

    expect(Storage.delete).toHaveBeenCalledWith(oldTokenKey);
    expect(Storage.delete).toHaveBeenCalledWith(oldRefreshKey);
    expect(Storage.delete).toHaveBeenCalledWith(oldUserKey);
  });

  it('skips server with no token', async () => {
    // server-a 有 user 但没有 token → 跳过
    const serverScope = `env_${SERVER_A.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    mockStorage[`${serverScope}:auth:user`] = JSON.stringify({ id: USER_ID, email: USER_EMAIL });

    await migrateAuthKeysToUserScoped();

    const accounts = await getRegisteredAccounts();
    expect(accounts).toHaveLength(0);
    expect(mockStorage['migration:authKeysV2']).toBe('done');
  });

  it('marks migration done even if no servers have tokens', async () => {
    await migrateAuthKeysToUserScoped();
    expect(mockStorage['migration:authKeysV2']).toBe('done');
  });
});

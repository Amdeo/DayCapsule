import { Storage } from '@/src/utils/storage';
import { useSyncStore } from '../syncStore';

let mockStorage = new Map<string, string>();

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setString: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    delete: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
  },
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrl: jest.fn().mockResolvedValue('https://server-a.example.com'),
  getServerKey: jest.fn((url: string) =>
    url === 'https://server-b.example.com'
      ? 'env_https_server_b_example_com'
      : 'env_https_server_a_example_com'
  ),
}));

import { getCurrentServerUrl } from '@/src/services/backendEnvironmentService';

const SERVER_A_SCOPE = 'env_https_server_a_example_com';
const SERVER_B_SCOPE = 'env_https_server_b_example_com';
const scopedKey = (scope: string, key: string) => `${scope}:${key}`;

describe('syncStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = new Map<string, string>();
    (Storage.getString as jest.Mock).mockImplementation(async (key: string) => mockStorage.get(key) ?? null);
    (Storage.setString as jest.Mock).mockImplementation(async (key: string, value: string) => {
      mockStorage.set(key, value);
    });
    (Storage.delete as jest.Mock).mockImplementation(async (key: string) => {
      mockStorage.delete(key);
    });
    (getCurrentServerUrl as jest.Mock).mockResolvedValue('https://server-a.example.com');
    useSyncStore.setState({
      syncCursor: 0,
      lastSyncAt: null,
      lastSyncError: null,
      initialSyncState: 'idle',
      lastMediaValidationSummary: null,
      isSyncing: false,
      isLoaded: false,
    });
  });

  it('loads persisted sync cursor and initial sync state from storage', async () => {
    (Storage.getString as jest.Mock).mockImplementation(async (key: string) => {
      switch (key) {
        case scopedKey(SERVER_A_SCOPE, 'cloudSync:cursor'):
          return '12';
        case scopedKey(SERVER_A_SCOPE, 'cloudSync:lastSyncAt'):
          return '1700000000000';
        case scopedKey(SERVER_A_SCOPE, 'cloudSync:lastSyncError'):
          return 'network timeout';
        case scopedKey(SERVER_A_SCOPE, 'cloudSync:initialSyncState'):
          return 'needs-decision';
        default:
          return null;
      }
    });

    await useSyncStore.getState().load();

    expect(useSyncStore.getState()).toMatchObject({
      syncCursor: 12,
      lastSyncAt: 1700000000000,
      lastSyncError: 'network timeout',
      initialSyncState: 'needs-decision',
      isLoaded: true,
    });
  });

  it('loads sync state from the current backend environment only', async () => {
    (getCurrentServerUrl as jest.Mock).mockResolvedValue('https://server-b.example.com');
    (Storage.getString as jest.Mock).mockImplementation(async (key: string) => {
      switch (key) {
        case scopedKey(SERVER_A_SCOPE, 'cloudSync:cursor'):
          return '12';
        case scopedKey(SERVER_B_SCOPE, 'cloudSync:cursor'):
          return '99';
        case scopedKey(SERVER_B_SCOPE, 'cloudSync:initialSyncState'):
          return 'ready';
        default:
          return null;
      }
    });

    await useSyncStore.getState().load();

    expect(useSyncStore.getState()).toMatchObject({
      syncCursor: 99,
      initialSyncState: 'ready',
      isLoaded: true,
    });
  });

  it('clears lastSyncError after a successful sync status update', async () => {
    useSyncStore.setState({
      syncCursor: 3,
      lastSyncAt: null,
      lastSyncError: 'network timeout',
      initialSyncState: 'checking',
      isSyncing: false,
      isLoaded: true,
    });

    await useSyncStore.getState().markSyncSuccess(1700000000123);

    expect(useSyncStore.getState()).toMatchObject({
      lastSyncAt: 1700000000123,
      lastSyncError: null,
    });
    expect(Storage.delete).toHaveBeenCalledWith(scopedKey(SERVER_A_SCOPE, 'cloudSync:lastSyncError'));
  });

  it('toggles isSyncing when sync starts and finishes', async () => {
    await useSyncStore.getState().markSyncStarted();
    expect(useSyncStore.getState().isSyncing).toBe(true);

    await useSyncStore.getState().markSyncFinished();
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  it('loads and resets the last media validation summary', async () => {
    const summary = {
      status: 'partial' as const,
      total: 3,
      downloaded: 2,
      missing: 1,
      failed: 0,
      suspect: 1,
      repairable: 1,
      lastError: 'missing file',
      lastValidatedAt: 1234,
    };

    await useSyncStore.getState().setMediaValidationSummary({
      ...summary,
    });

    expect(
      await Storage.getString(scopedKey(SERVER_A_SCOPE, 'cloudSync:lastMediaValidationSummary'))
    ).toBe(JSON.stringify(summary));

    await useSyncStore.getState().load();

    expect(useSyncStore.getState().lastMediaValidationSummary).toEqual(summary);
  });

  it('clears the last media validation summary on reset', async () => {
    await useSyncStore.getState().setMediaValidationSummary({
      status: 'success',
      total: 1,
      downloaded: 1,
      missing: 0,
      failed: 0,
      suspect: 0,
      repairable: 0,
      lastError: null,
      lastValidatedAt: 5678,
    });

    await useSyncStore.getState().reset();

    expect(useSyncStore.getState().lastMediaValidationSummary).toBeNull();
    expect(Storage.delete).toHaveBeenCalledWith(
      scopedKey(SERVER_A_SCOPE, 'cloudSync:lastMediaValidationSummary')
    );
  });

  it.each([
    ['[]', 'an array'],
    [JSON.stringify({ status: 'success' }), 'an incomplete object'],
  ])('treats malformed persisted media validation summaries as null: %s', async (raw) => {
    mockStorage.set(scopedKey(SERVER_A_SCOPE, 'cloudSync:lastMediaValidationSummary'), raw);

    await useSyncStore.getState().load();

    expect(useSyncStore.getState().lastMediaValidationSummary).toBeNull();
  });
});

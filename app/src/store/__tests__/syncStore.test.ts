import { Storage } from '@/src/utils/storage';
import { useSyncStore } from '../syncStore';

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
    getString: jest.fn(async () => null),
    setString: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
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
    (getCurrentServerUrl as jest.Mock).mockResolvedValue('https://server-a.example.com');
    useSyncStore.setState({
      syncCursor: 0,
      lastSyncAt: null,
      lastSyncError: null,
      initialSyncState: 'idle',
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
});
